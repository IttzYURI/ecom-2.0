import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type Inquiry = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

const inquiriesFilePath = path.join(process.cwd(), "data", "inquiries-content.json");

type InquiryStore = Record<string, Inquiry[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureInquiriesStoreFile() {
  try {
    await fs.access(inquiriesFilePath);
  } catch {
    await fs.mkdir(path.dirname(inquiriesFilePath), { recursive: true });
    await fs.writeFile(inquiriesFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readInquiriesStore(): Promise<InquiryStore> {
  await ensureInquiriesStoreFile();
  const raw = await fs.readFile(inquiriesFilePath, "utf8");
  return JSON.parse(raw) as InquiryStore;
}

async function writeInquiriesStore(store: InquiryStore) {
  await fs.writeFile(inquiriesFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function createStoredInquiry(
  tenantId: string,
  input: Omit<Inquiry, "id" | "tenantId" | "createdAt">
) {
  const inquiry: Inquiry = {
    id: createId("inq"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...input
  };
  const existing = (await getTenantDocument<Inquiry[]>("inquiries_content", tenantId)) ?? [];
  const next = [inquiry, ...existing].slice(0, 100);
  const savedToMongo = await saveTenantDocument("inquiries_content", tenantId, next);

  if (!savedToMongo) {
    const store = await readInquiriesStore();
    store[tenantId] = next;
    await writeInquiriesStore(store);
  }

  return inquiry;
}
