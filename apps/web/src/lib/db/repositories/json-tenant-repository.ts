import type { Tenant, StorefrontContent } from "@rcc/contracts";

import { getStoredStorefrontContent } from "../../content-store";
import {
  getPlatformTenantRegistryRecord,
  listPlatformTenantRegistryRecords
} from "../../platform-tenant-store";
import { getStoredTenantSettings } from "../../settings-store";
import type { TenantSettingsRecord } from "../models";
import { createTenantScope, type TenantScope } from "../tenant-scope";
import type { TenantRepository } from "./tenant-repository";

const LEGACY_CREATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_DELIVERY_FEE_MINOR = 350;

function mapLegacySettings(
  tenant: Tenant,
  storefrontContent: StorefrontContent
): TenantSettingsRecord {
  return {
    tenantId: tenant.id,
    description: tenant.description || null,
    cuisine: tenant.cuisine || null,
    contactEmail: tenant.email || null,
    contactPhone: tenant.phone || null,
    addressLine1: tenant.address || null,
    addressLine2: null,
    city: null,
    postcode: null,
    deliveryEnabled: true,
    collectionEnabled: true,
    bookingEnabled: true,
    defaultDeliveryFeeMinor: DEFAULT_DELIVERY_FEE_MINOR,
    brandingPrimaryColor: tenant.branding.primaryColor || null,
    brandingAccentColor: tenant.branding.accentColor || null,
    brandingLogoText: tenant.branding.logoText || null,
    brandingHeroImageUrl: tenant.branding.heroImage || null,
    storefrontContent,
    deliveryPostcodes: [...tenant.deliveryPostcodes],
    createdAt: LEGACY_CREATED_AT,
    updatedAt: LEGACY_CREATED_AT
  };
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/:\d+$/g, "");
}

async function getLegacyTenantById(tenantId: string) {
  const tenantSettings = await getStoredTenantSettings(tenantId);
  return tenantSettings;
}

export class JsonTenantRepository implements TenantRepository {
  async listTenants() {
    return (await listPlatformTenantRegistryRecords()).map((record) => record.tenant);
  }

  async getTenantById(tenantId: string) {
    return (await getPlatformTenantRegistryRecord(tenantId))?.tenant ?? null;
  }

  async getTenantBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return null;
    }

    const match = (await listPlatformTenantRegistryRecords()).find(
      (record) =>
        record.tenant.slug.toLowerCase() === normalizedSlug ||
        record.domains.some(
          (domain) =>
            domain.domainType === "subdomain" &&
            domain.domain.split(".")[0] === normalizedSlug
        )
    );

    return match?.tenant ?? null;
  }

  async getTenantByDomain(domain: string) {
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
      return null;
    }

    const match = (await listPlatformTenantRegistryRecords()).find((record) =>
      record.domains.some((domainRecord) => domainRecord.domain === normalizedDomain)
    );

    return match?.tenant ?? null;
  }

  async getTenantSettings(scope: TenantScope) {
    const tenant = await getLegacyTenantById(createTenantScope(scope.tenantId).tenantId);
    const storefrontContent = await getStoredStorefrontContent(scope.tenantId);
    return mapLegacySettings(tenant, storefrontContent);
  }

  async getTenantDomains(tenantId: string) {
    return (await getPlatformTenantRegistryRecord(tenantId))?.domains ?? [];
  }

  async getTenantFoundationSnapshot(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);

    if (!tenant) {
      return null;
    }

    const scope = createTenantScope(tenantId);
    const [settings, domains] = await Promise.all([
      this.getTenantSettings(scope),
      this.getTenantDomains(tenantId)
    ]);

    return {
      tenant,
      settings,
      domains,
      subscription: (await getPlatformTenantRegistryRecord(tenantId))?.subscription ?? null
    };
  }
}
