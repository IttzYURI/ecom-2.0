import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type OwnerAccessMode = "temporary_password" | "invite_link";
export type ThemePreset = "sunset" | "forest" | "midnight" | "minimal";

export type TenantSetupRecord = {
  tenantId: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  logoUrl: string | null;
  defaultCurrency: string;
  timezone: string;
  ownerName: string;
  ownerEmail: string;
  ownerAccessMode: OwnerAccessMode;
  subdomain: string;
  customDomain: string | null;
  homepageTitle: string;
  shortDescription: string;
  themePreset: ThemePreset;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
  defaultCollectionTimeMinutes: number;
  defaultDeliveryTimeMinutes: number;
  deliveryRadiusMiles: number;
  minimumOrderAmount: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
};

const setupFilePath = path.join(process.cwd(), "data", "tenant-setup.json");

type TenantSetupStore = Record<string, TenantSetupRecord>;

async function ensureSetupFile() {
  try {
    await fs.access(setupFilePath);
  } catch {
    await fs.mkdir(path.dirname(setupFilePath), { recursive: true });
    await fs.writeFile(setupFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readSetupStore(): Promise<TenantSetupStore> {
  await ensureSetupFile();
  const raw = await fs.readFile(setupFilePath, "utf8");
  return JSON.parse(raw) as TenantSetupStore;
}

async function writeSetupStore(store: TenantSetupStore) {
  await fs.writeFile(setupFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getTenantSetupRecord(tenantId: string) {
  const setup = await getTenantDocument<TenantSetupRecord>("tenant_setup", tenantId);

  if (setup) {
    return setup;
  }

  const store = await readSetupStore();
  return store[tenantId] ?? null;
}

export async function saveTenantSetupRecord(record: TenantSetupRecord) {
  const savedToMongo = await saveTenantDocument("tenant_setup", record.tenantId, record);

  if (savedToMongo) {
    return record;
  }

  const store = await readSetupStore();
  store[record.tenantId] = record;
  await writeSetupStore(store);
  return record;
}
