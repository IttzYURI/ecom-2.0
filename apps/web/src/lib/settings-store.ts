import { promises as fs } from "node:fs";
import path from "node:path";

import type { Tenant } from "@rcc/contracts";

import { getDefaultTenant, getDefaultTenantCopy } from "./mock-data";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

const settingsFilePath = path.join(process.cwd(), "data", "settings-content.json");

type SettingsStore = Record<string, Tenant>;

async function ensureSettingsStoreFile() {
  try {
    await fs.access(settingsFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const initial: SettingsStore = {
      [tenantId]: getDefaultTenantCopy(tenantId)
    };
    await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
    await fs.writeFile(settingsFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readSettingsStore(): Promise<SettingsStore> {
  await ensureSettingsStoreFile();
  const raw = await fs.readFile(settingsFilePath, "utf8");
  return JSON.parse(raw) as SettingsStore;
}

async function writeSettingsStore(store: SettingsStore) {
  await fs.writeFile(settingsFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoredTenantSettings(tenantId: string): Promise<Tenant> {
  const mongoTenant = await getTenantDocument<Tenant>("tenant_settings", tenantId);

  if (mongoTenant) {
    return mongoTenant;
  }

  const store = await readSettingsStore();
  return store[tenantId] ?? getDefaultTenantCopy(tenantId);
}

export async function updateStoredTenantSettings(tenantId: string, tenant: Tenant) {
  const savedToMongo = await saveTenantDocument("tenant_settings", tenantId, tenant);

  if (savedToMongo) {
    return;
  }

  const store = await readSettingsStore();
  store[tenantId] = tenant;
  await writeSettingsStore(store);
}
