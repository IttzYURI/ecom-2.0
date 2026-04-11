import { promises as fs } from "node:fs";
import path from "node:path";

import { getMongoDb, isMongoConfigured } from "./mongo";

export type AuditEntry = {
  id: string;
  tenantId: string;
  action: string;
  actorEmail: string;
  target: string;
  summary: string;
  createdAt: string;
};

const auditFilePath = path.join(process.cwd(), "data", "audit-log.json");

type AuditStore = Record<string, AuditEntry[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureAuditFile() {
  try {
    await fs.access(auditFilePath);
  } catch {
    await fs.mkdir(path.dirname(auditFilePath), { recursive: true });
    await fs.writeFile(auditFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readAuditStore(): Promise<AuditStore> {
  await ensureAuditFile();
  const raw = await fs.readFile(auditFilePath, "utf8");
  return JSON.parse(raw) as AuditStore;
}

async function writeAuditStore(store: AuditStore) {
  await fs.writeFile(auditFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function listAuditEntries(tenantId: string, limit = 12) {
  if (isMongoConfigured()) {
    const db = await getMongoDb();
    return db
      .collection<AuditEntry>("audit_log")
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  const store = await readAuditStore();
  return (store[tenantId] ?? []).slice(0, limit);
}

export async function recordAuditEntry(
  tenantId: string,
  input: Omit<AuditEntry, "id" | "tenantId" | "createdAt">
) {
  const entry: AuditEntry = {
    id: createId("audit"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...input
  };

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    await db.collection<AuditEntry>("audit_log").insertOne(entry);
    return entry;
  }

  const store = await readAuditStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = [entry, ...current].slice(0, 100);
  await writeAuditStore(store);
  return entry;
}
