import type { TenantBundle } from "@rcc/contracts";

import { getDefaultTenant } from "./mock-data";
import { getRuntimeTenantBundle } from "./content-store";
import type { TenantFeatureFlagsRecord } from "./tenant-feature-flags-store";
import { getTenantFeatureFlagsRecord } from "./tenant-feature-flags-store";
import { getStoredTenantSettings } from "./settings-store";
import {
  resolveTenantFromServerHeaders,
  getRequestHostname,
  getConfiguredPlatformHosts
} from "./tenant-resolver";

export type PublicTenantStatus = "active" | "suspended" | "archived" | "missing";

export type PublicTenantResult = {
  bundle: TenantBundle;
  status: PublicTenantStatus;
  features: TenantFeatureFlagsRecord | null;
};

export async function resolveTenantIdFromRequest() {
  const resolvedTenant = await resolveTenantFromServerHeaders({
    allowDefaultFallback: true
  });

  return resolvedTenant?.tenantId ?? getDefaultTenant().id;
}

export async function resolveTenantFromRequest() {
  return getStoredTenantSettings(await resolveTenantIdFromRequest());
}

function isPlatformHost(hostname: string) {
  const platformHosts = getConfiguredPlatformHosts();
  return platformHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

export async function resolvePublicTenantBundle(): Promise<PublicTenantResult> {
  const resolved = await resolveTenantFromServerHeaders({ allowDefaultFallback: false });

  if (resolved) {
    const [bundle, features] = await Promise.all([
      getRuntimeTenantBundle(resolved.tenantId),
      getTenantFeatureFlagsRecord(resolved.tenantId)
    ]);

    if (bundle.tenant.status === "suspended") {
      return { bundle, status: "suspended", features };
    }

    if (bundle.tenant.status === "archived") {
      return { bundle, status: "archived", features };
    }

    return { bundle, status: "active", features };
  }

  const hostname = await (async () => {
    try {
      const { headers } = await import("next/headers");
      return getRequestHostname(await headers());
    } catch {
      return "";
    }
  })();

  if (!hostname || isPlatformHost(hostname)) {
    const defaultTenant = getDefaultTenant();
    const [bundle, features] = await Promise.all([
      getRuntimeTenantBundle(defaultTenant.id),
      getTenantFeatureFlagsRecord(defaultTenant.id)
    ]);
    return { bundle, status: "active", features };
  }

  const defaultTenant = getDefaultTenant();
  const [bundle, features] = await Promise.all([
    getRuntimeTenantBundle(defaultTenant.id),
    getTenantFeatureFlagsRecord(defaultTenant.id)
  ]);
  return { bundle, status: "missing", features };
}
