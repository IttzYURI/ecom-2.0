import { randomBytes, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getMongoDb, isMongoConfigured } from "./mongo";

export type ExtAdminInviteRecord = {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  tokenHash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdByEmail: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
};

const inviteFilePath = path.join(process.cwd(), "data", "extadmin-invites.json");

type ExtAdminInviteStore = Record<string, ExtAdminInviteRecord[]>;

let inviteIndexesPromise: Promise<void> | null = null;

function getInvitePepper() {
  return (
    process.env.EXTADMIN_INVITE_SECRET?.trim() ||
    process.env.EXTADMIN_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "extadmin-invite-dev-secret"
  );
}

function createInviteId() {
  return `invite_${randomBytes(12).toString("hex")}`;
}

function createInviteToken() {
  return `inv_${randomBytes(24).toString("base64url")}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256")
    .update(`${getInvitePepper()}:${token}`)
    .digest("hex");
}

async function ensureInviteFile() {
  try {
    await fs.access(inviteFilePath);
  } catch {
    await fs.mkdir(path.dirname(inviteFilePath), { recursive: true });
    await fs.writeFile(inviteFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readInviteStore(): Promise<ExtAdminInviteStore> {
  await ensureInviteFile();
  const raw = await fs.readFile(inviteFilePath, "utf8");
  return JSON.parse(raw) as ExtAdminInviteStore;
}

async function writeInviteStore(store: ExtAdminInviteStore) {
  await fs.writeFile(inviteFilePath, JSON.stringify(store, null, 2), "utf8");
}

async function ensureInviteIndexes() {
  if (!isMongoConfigured()) {
    return;
  }

  if (!inviteIndexesPromise) {
    inviteIndexesPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<ExtAdminInviteRecord>("extadmin_invites").createIndex({ id: 1 }, { unique: true }),
        db.collection<ExtAdminInviteRecord>("extadmin_invites").createIndex(
          { tokenHash: 1 },
          { unique: true }
        ),
        db.collection<ExtAdminInviteRecord>("extadmin_invites").createIndex({ tenantId: 1, createdAt: -1 })
      ]);
    })();
  }

  await inviteIndexesPromise;
}

export async function createExtAdminInvite(input: {
  tenantId: string;
  userId: string;
  email: string;
  createdByEmail: string;
  expiresInHours?: number;
}) {
  const token = createInviteToken();
  const now = new Date();
  const record: ExtAdminInviteRecord = {
    id: createInviteId(),
    tenantId: input.tenantId,
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    tokenHash: hashInviteToken(token),
    status: "pending",
    createdByEmail: input.createdByEmail.trim().toLowerCase(),
    createdAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + (input.expiresInHours ?? 72) * 60 * 60 * 1000
    ).toISOString()
  };

  if (isMongoConfigured()) {
    await ensureInviteIndexes();
    const db = await getMongoDb();
    await db.collection<ExtAdminInviteRecord>("extadmin_invites").insertOne(record);
    return { invite: record, token };
  }

  const store = await readInviteStore();
  const current = store[input.tenantId] ?? [];
  store[input.tenantId] = [record, ...current];
  await writeInviteStore(store);
  return { invite: record, token };
}

function normalizeInviteRecord(record: ExtAdminInviteRecord | null) {
  if (!record) {
    return null;
  }

  if (
    record.status === "pending" &&
    new Date(record.expiresAt).getTime() < Date.now()
  ) {
    return {
      ...record,
      status: "expired" as const
    };
  }

  return record;
}

export async function getExtAdminInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token);

  if (isMongoConfigured()) {
    await ensureInviteIndexes();
    const db = await getMongoDb();
    const invite = await db.collection<ExtAdminInviteRecord>("extadmin_invites").findOne({ tokenHash });
    return normalizeInviteRecord(invite);
  }

  const store = await readInviteStore();

  for (const invites of Object.values(store)) {
    const invite = invites.find((entry) => entry.tokenHash === tokenHash);

    if (invite) {
      return normalizeInviteRecord(invite);
    }
  }

  return null;
}

export async function markExtAdminInviteAccepted(tenantId: string, inviteId: string) {
  const acceptedAt = new Date().toISOString();

  if (isMongoConfigured()) {
    await ensureInviteIndexes();
    const db = await getMongoDb();
    await db.collection<ExtAdminInviteRecord>("extadmin_invites").updateOne(
      { tenantId, id: inviteId },
      {
        $set: {
          status: "accepted",
          acceptedAt
        }
      }
    );
    return;
  }

  const store = await readInviteStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = current.map((invite) =>
    invite.id === inviteId
      ? {
          ...invite,
          status: "accepted",
          acceptedAt
        }
      : invite
  );
  await writeInviteStore(store);
}
