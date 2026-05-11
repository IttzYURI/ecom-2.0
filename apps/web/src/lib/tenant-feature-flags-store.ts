import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type FeatureFlagKey =
  | "onlineOrdering"
  | "cashPayment"
  | "cardPayment"
  | "customerLogin"
  | "tableBooking"
  | "reviews"
  | "gallery"
  | "printerIntegration"
  | "driverModule"
  | "promotions"
  | "customDomain"
  | "advancedReports";

export type TenantFeatureFlagsRecord = {
  tenantId: string;
  onlineOrdering: boolean;
  cashPayment: boolean;
  cardPayment: boolean;
  customerLogin: boolean;
  tableBooking: boolean;
  reviews: boolean;
  gallery: boolean;
  printerIntegration: boolean;
  driverModule: boolean;
  promotions: boolean;
  customDomain: boolean;
  advancedReports: boolean;
  createdAt: string;
  updatedAt: string;
};

const featureFlagsFilePath = path.join(process.cwd(), "data", "tenant-feature-flags.json");

type TenantFeatureFlagsStore = Record<string, TenantFeatureFlagsRecord>;

async function ensureFeatureFlagsFile() {
  try {
    await fs.access(featureFlagsFilePath);
  } catch {
    await fs.mkdir(path.dirname(featureFlagsFilePath), { recursive: true });
    await fs.writeFile(featureFlagsFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readFeatureFlagsStore(): Promise<TenantFeatureFlagsStore> {
  await ensureFeatureFlagsFile();
  const raw = await fs.readFile(featureFlagsFilePath, "utf8");
  return JSON.parse(raw) as TenantFeatureFlagsStore;
}

async function writeFeatureFlagsStore(store: TenantFeatureFlagsStore) {
  await fs.writeFile(featureFlagsFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getTenantFeatureFlagsRecord(tenantId: string) {
  const featureFlags = await getTenantDocument<TenantFeatureFlagsRecord>(
    "tenant_feature_flags",
    tenantId
  );

  if (featureFlags) {
    return migrateFeatureFlags(featureFlags);
  }

  const store = await readFeatureFlagsStore();
  const raw = store[tenantId] ?? null;
  return raw ? migrateFeatureFlags(raw) : null;
}

function migrateFeatureFlags(record: TenantFeatureFlagsRecord): TenantFeatureFlagsRecord {
  return {
    tenantId: record.tenantId,
    onlineOrdering: record.onlineOrdering ?? true,
    cashPayment: record.cashPayment ?? true,
    cardPayment: record.cardPayment ?? true,
    customerLogin: record.customerLogin ?? true,
    tableBooking: record.tableBooking ?? true,
    reviews: record.reviews ?? true,
    gallery: record.gallery ?? true,
    printerIntegration: record.printerIntegration ?? true,
    driverModule: record.driverModule ?? true,
    promotions: record.promotions ?? true,
    customDomain: record.customDomain ?? true,
    advancedReports: record.advancedReports ?? true,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function saveTenantFeatureFlagsRecord(record: TenantFeatureFlagsRecord) {
  const savedToMongo = await saveTenantDocument(
    "tenant_feature_flags",
    record.tenantId,
    record
  );

  if (savedToMongo) {
    return record;
  }

  const store = await readFeatureFlagsStore();
  store[record.tenantId] = record;
  await writeFeatureFlagsStore(store);
  return record;
}
