import { promises as fs } from "node:fs";
import path from "node:path";

import type { Tenant } from "@rcc/contracts";

import { getMongoDb, isMongoConfigured } from "./mongo";
import type {
  SubscriptionRecord,
  TenantDomainRecord,
  TenantRecord
} from "./db/models";
import { listTenants } from "./mock-data";
import { getStoredTenantSettings } from "./settings-store";

const platformTenantStorePath = path.join(process.cwd(), "data", "platform-tenants.json");
const LEGACY_CREATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_TIMEZONE = "Europe/London";
const DEFAULT_CURRENCY_CODE = "GBP";
const DEFAULT_COUNTRY_CODE = "GB";
const DEFAULT_BILLING_INTERVAL = "monthly";
const DEFAULT_PLAN_CODE = "starter";
function getPlatformDomain(): string {
  const configured = String(process.env.TENANT_PLATFORM_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return configured[0] || "platform.test";
}

export const PLATFORM_FEATURE_KEYS = [
  "storefront",
  "restaurant_admin",
  "menu_management",
  "bookings",
  "delivery",
  "customer_accounts",
  "stripe_payments",
  "printing",
  "custom_domains",
  "gallery",
  "promotions",
  "advanced_reports"
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_KEYS)[number];

export interface PlatformTenantRegistryRecord {
  tenant: TenantRecord;
  domains: TenantDomainRecord[];
  subscription: SubscriptionRecord | null;
  features: PlatformFeatureKey[];
  source: "legacy_seed" | "platform";
}

type StoredPlatformTenantRegistryRecord = PlatformTenantRegistryRecord & {
  tenantId: string;
};

type PlatformTenantStore = {
  tenants: Record<string, PlatformTenantRegistryRecord>;
};

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/g, "").replace(/\.$/g, "");
}

function normalizeFeatureList(features: Iterable<string>) {
  const normalized = new Set<PlatformFeatureKey>();

  for (const feature of features) {
    if (PLATFORM_FEATURE_KEYS.includes(feature as PlatformFeatureKey)) {
      normalized.add(feature as PlatformFeatureKey);
    }
  }

  return Array.from(normalized);
}

function parseConfiguredCustomDomains() {
  return String(process.env.TENANT_CUSTOM_DOMAIN_MAP ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [domainPart, tenantIdPart] = entry.split("=");
      const domain = normalizeDomain(domainPart ?? "");
      const tenantId = tenantIdPart?.trim();

      if (!domain || !tenantId) {
        return null;
      }

      return {
        domain,
        tenantId
      };
    })
    .filter((entry): entry is { domain: string; tenantId: string } => Boolean(entry));
}

function getDefaultFeatureList() {
  return [...PLATFORM_FEATURE_KEYS];
}

function createDefaultSubscription(tenantId: string): SubscriptionRecord {
  return {
    id: `sub_${tenantId}`,
    tenantId,
    provider: "stripe",
    providerCustomerId: null,
    providerSubscriptionId: null,
    planCode: DEFAULT_PLAN_CODE,
    status: "active",
    billingInterval: DEFAULT_BILLING_INTERVAL,
    trialEndsAt: null,
    currentPeriodStartsAt: null,
    currentPeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    createdAt: LEGACY_CREATED_AT,
    updatedAt: LEGACY_CREATED_AT
  };
}

function mapTenantSettingsToRecord(tenant: Tenant): TenantRecord {
  return {
    id: tenant.id,
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    legalName: tenant.name,
    supportEmail: tenant.email || null,
    supportPhone: tenant.phone || null,
    timezone: DEFAULT_TIMEZONE,
    currencyCode: DEFAULT_CURRENCY_CODE,
    countryCode: DEFAULT_COUNTRY_CODE,
    createdAt: LEGACY_CREATED_AT,
    updatedAt: LEGACY_CREATED_AT
  };
}

function createDefaultDomainRecord(
  tenantRecord: TenantRecord,
  subdomain: string
): TenantDomainRecord {
  const normalizedSubdomain = normalizeDomain(subdomain);

  return {
    id: `domain_${tenantRecord.id}`,
    tenantId: tenantRecord.id,
    domain: `${normalizedSubdomain}.${getPlatformDomain()}`,
    domainType: "subdomain",
    isPrimary: true,
    verificationStatus: "verified",
    sslStatus: "active",
    createdAt: tenantRecord.createdAt,
    updatedAt: tenantRecord.updatedAt
  };
}

function normalizeTenantRecord(record: TenantRecord): TenantRecord {
  return {
    ...record,
    id: record.id.trim(),
    tenantId: (record.tenantId?.trim() || record.id).trim(),
    slug: record.slug.trim().toLowerCase(),
    name: record.name.trim(),
    status: record.status,
    legalName: record.legalName?.trim() || null,
    supportEmail: record.supportEmail?.trim().toLowerCase() || null,
    supportPhone: record.supportPhone?.trim() || null,
    timezone: record.timezone?.trim() || DEFAULT_TIMEZONE,
    currencyCode: record.currencyCode?.trim().toUpperCase() || DEFAULT_CURRENCY_CODE,
    countryCode: record.countryCode?.trim().toUpperCase() || DEFAULT_COUNTRY_CODE,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString()
  };
}

function normalizeDomainRecord(
  record: TenantDomainRecord,
  fallbackTenant: TenantRecord
): TenantDomainRecord {
  return {
    ...record,
    id: record.id.trim(),
    tenantId: fallbackTenant.id,
    domain: normalizeDomain(record.domain),
    domainType: record.domainType,
    isPrimary: Boolean(record.isPrimary),
    verificationStatus: record.verificationStatus,
    sslStatus: record.sslStatus,
    createdAt: record.createdAt || fallbackTenant.createdAt,
    updatedAt: record.updatedAt || fallbackTenant.updatedAt
  };
}

function normalizeSubscriptionRecord(record: SubscriptionRecord | null, tenantId: string) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    tenantId,
    id: record.id.trim(),
    planCode: record.planCode.trim(),
    providerCustomerId: record.providerCustomerId?.trim() || null,
    providerSubscriptionId: record.providerSubscriptionId?.trim() || null,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString()
  } satisfies SubscriptionRecord;
}

function normalizeRegistryRecord(record: PlatformTenantRegistryRecord): PlatformTenantRegistryRecord {
  const tenant = normalizeTenantRecord(record.tenant);
  const domains = record.domains.length
    ? record.domains.map((domain) => normalizeDomainRecord(domain, tenant))
    : [createDefaultDomainRecord(tenant, tenant.slug)];

  return {
    tenant,
    domains,
    subscription: normalizeSubscriptionRecord(record.subscription, tenant.id),
    features: normalizeFeatureList(record.features),
    source: record.source
  };
}

async function ensurePlatformTenantStoreFile() {
  try {
    await fs.access(platformTenantStorePath);
  } catch {
    await fs.mkdir(path.dirname(platformTenantStorePath), { recursive: true });
    await fs.writeFile(
      platformTenantStorePath,
      JSON.stringify({ tenants: {} } satisfies PlatformTenantStore, null, 2),
      "utf8"
    );
  }
}

async function readPlatformTenantStore(): Promise<PlatformTenantStore> {
  await ensurePlatformTenantStoreFile();
  const raw = await fs.readFile(platformTenantStorePath, "utf8");
  return JSON.parse(raw) as PlatformTenantStore;
}

async function writePlatformTenantStore(store: PlatformTenantStore) {
  await fs.writeFile(platformTenantStorePath, JSON.stringify(store, null, 2), "utf8");
}

async function listStoredPlatformTenantRegistryRecords() {
  const [jsonStore, mongoRecords] = await Promise.all([
    readPlatformTenantStore(),
    isMongoConfigured()
      ? getMongoDb()
          .then((db) =>
            db
              .collection<StoredPlatformTenantRegistryRecord>("platform_tenant_registry")
              .find({})
              .toArray()
          )
          .catch(() => [])
      : Promise.resolve([])
  ]);
  const merged = new Map<string, PlatformTenantRegistryRecord>();

  for (const record of Object.values(jsonStore.tenants ?? {})) {
    const normalizedRecord = normalizeRegistryRecord(record);
    merged.set(normalizedRecord.tenant.id, normalizedRecord);
  }

  for (const record of mongoRecords) {
    const normalizedRecord = normalizeRegistryRecord(record);
    merged.set(normalizedRecord.tenant.id, normalizedRecord);
  }

  return Array.from(merged.values());
}

async function buildLegacyRegistryRecord(tenantId: string) {
  const tenantSettings = await getStoredTenantSettings(tenantId);
  const tenantRecord = mapTenantSettingsToRecord(tenantSettings);
  const configuredCustomDomains = parseConfiguredCustomDomains()
    .filter((entry) => entry.tenantId === tenantId)
    .map((entry, index) => ({
      id: `domain_custom_${tenantId}_${index + 1}`,
      tenantId,
      domain: entry.domain,
      domainType: "custom" as const,
      isPrimary: false,
      verificationStatus: "verified" as const,
      sslStatus: "active" as const,
      createdAt: LEGACY_CREATED_AT,
      updatedAt: LEGACY_CREATED_AT
    }));

  return normalizeRegistryRecord({
    tenant: tenantRecord,
    domains: [createDefaultDomainRecord(tenantRecord, tenantSettings.subdomain), ...configuredCustomDomains],
    subscription: createDefaultSubscription(tenantId),
    features: getDefaultFeatureList(),
    source: "legacy_seed"
  });
}

export async function listPlatformTenantRegistryRecords() {
  const [store, legacyTenants] = await Promise.all([
    listStoredPlatformTenantRegistryRecords(),
    Promise.resolve(listTenants())
  ]);
  const merged = new Map<string, PlatformTenantRegistryRecord>();

  for (const legacyTenant of legacyTenants) {
    merged.set(legacyTenant.id, await buildLegacyRegistryRecord(legacyTenant.id));
  }

  for (const record of store) {
    const normalizedRecord = normalizeRegistryRecord(record);
    merged.set(normalizedRecord.tenant.id, normalizedRecord);
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.tenant.name.localeCompare(right.tenant.name)
  );
}

export async function getPlatformTenantRegistryRecord(tenantId: string) {
  const records = await listPlatformTenantRegistryRecords();
  return records.find((record) => record.tenant.id === tenantId) ?? null;
}

export async function savePlatformTenantRegistryRecord(record: PlatformTenantRegistryRecord) {
  const normalizedRecord = normalizeRegistryRecord(record);

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    await db.collection<StoredPlatformTenantRegistryRecord>("platform_tenant_registry").updateOne(
      { tenantId: normalizedRecord.tenant.id },
      {
        $set: {
          tenantId: normalizedRecord.tenant.id,
          ...normalizedRecord
        }
      },
      { upsert: true }
    );
  } else {
    const store = await readPlatformTenantStore();
    store.tenants[normalizedRecord.tenant.id] = normalizedRecord;
    await writePlatformTenantStore(store);
  }

  return normalizedRecord;
}
