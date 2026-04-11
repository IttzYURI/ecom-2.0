import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type NotificationEntry = {
  id: string;
  tenantId: string;
  channel: "email";
  to: string;
  subject: string;
  text: string;
  status: "queued" | "sent" | "failed";
  createdAt: string;
};

const notificationsFilePath = path.join(process.cwd(), "data", "notifications-content.json");

type NotificationStore = Record<string, NotificationEntry[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureNotificationsStoreFile() {
  try {
    await fs.access(notificationsFilePath);
  } catch {
    await fs.mkdir(path.dirname(notificationsFilePath), { recursive: true });
    await fs.writeFile(notificationsFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readNotificationsStore(): Promise<NotificationStore> {
  await ensureNotificationsStoreFile();
  const raw = await fs.readFile(notificationsFilePath, "utf8");
  return JSON.parse(raw) as NotificationStore;
}

async function writeNotificationsStore(store: NotificationStore) {
  await fs.writeFile(notificationsFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function listStoredNotifications(tenantId: string, limit = 20) {
  const mongoNotifications = await getTenantDocument<NotificationEntry[]>(
    "notifications_content",
    tenantId
  );

  if (mongoNotifications) {
    return mongoNotifications.slice(0, limit);
  }

  const store = await readNotificationsStore();
  return (store[tenantId] ?? []).slice(0, limit);
}

export async function createStoredNotification(
  tenantId: string,
  input: Omit<NotificationEntry, "id" | "tenantId" | "createdAt">
) {
  const entry: NotificationEntry = {
    id: createId("notice"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...input
  };

  const existing = await listStoredNotifications(tenantId, 100);
  const next = [entry, ...existing].slice(0, 100);
  const savedToMongo = await saveTenantDocument("notifications_content", tenantId, next);

  if (!savedToMongo) {
    const store = await readNotificationsStore();
    store[tenantId] = next;
    await writeNotificationsStore(store);
  }

  return entry;
}
