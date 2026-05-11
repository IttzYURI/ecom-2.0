import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { createTenantRepository } from "./db/repositories/create-tenant-repository";
import type { TenantRecord } from "./db/models";
import { TenantFoundationService } from "./db/services/tenant-foundation-service";
import { getDefaultTenant } from "./mock-data";

const DEFAULT_PLATFORM_HOSTS = ["platform.test", "localhost", "127.0.0.1"];

export type TenantResolutionSource =
  | "custom_domain"
  | "subdomain"
  | "extadmin_session"
  | "fallback_default";

export type TenantResolutionResult = {
  tenantId: string;
  tenant: TenantRecord | null;
  source: TenantResolutionSource;
  hostname: string | null;
  matchedDomain: string | null;
  matchedSubdomain: string | null;
};

export type ExtAdminTenantSessionLike = {
  tenantId?: string | null;
};

type HeaderCarrier = Headers | Pick<NextRequest, "headers">;

let tenantFoundationService: TenantFoundationService | null = null;

function getTenantFoundationService() {
  if (!tenantFoundationService) {
    tenantFoundationService = new TenantFoundationService(createTenantRepository());
  }

  return tenantFoundationService;
}

function getHeadersBag(input: HeaderCarrier) {
  return input instanceof Headers ? input : input.headers;
}

export function getConfiguredPlatformHosts() {
  const configuredHosts = String(process.env.TENANT_PLATFORM_HOSTS ?? "")
    .split(",")
    .map((entry) => normalizeTenantHostname(entry))
    .filter(Boolean);

  return configuredHosts.length ? configuredHosts : DEFAULT_PLATFORM_HOSTS;
}

function createResolutionResult(input: {
  tenantId: string;
  tenant: TenantRecord | null;
  source: TenantResolutionSource;
  hostname?: string | null;
  matchedDomain?: string | null;
  matchedSubdomain?: string | null;
}): TenantResolutionResult {
  return {
    tenantId: input.tenantId,
    tenant: input.tenant,
    source: input.source,
    hostname: input.hostname ?? null,
    matchedDomain: input.matchedDomain ?? null,
    matchedSubdomain: input.matchedSubdomain ?? null
  };
}

async function resolveTenantRecordById(tenantId: string) {
  return getTenantFoundationService().resolveTenant({ id: tenantId });
}

async function buildDefaultTenantResolution(hostname?: string | null) {
  const defaultTenant = getDefaultTenant();
  const tenant = await resolveTenantRecordById(defaultTenant.id);

  return createResolutionResult({
    tenantId: defaultTenant.id,
    tenant,
    source: "fallback_default",
    hostname: normalizeTenantHostname(hostname)
  });
}

function extractSubdomainCandidate(hostname: string) {
  for (const platformHost of getConfiguredPlatformHosts()) {
    if (hostname === platformHost) {
      return null;
    }

    const suffix = `.${platformHost}`;

    if (hostname.endsWith(suffix)) {
      const candidate = hostname.slice(0, -suffix.length).trim();
      return candidate || null;
    }
  }

  return null;
}

export function normalizeTenantHostname(hostname: string | null | undefined) {
  if (!hostname) {
    return "";
  }

  return hostname.trim().toLowerCase().replace(/:\d+$/g, "").replace(/\.$/g, "");
}

export function getRequestHostname(input: HeaderCarrier) {
  const headerStore = getHeadersBag(input);

  return normalizeTenantHostname(
    headerStore.get("x-forwarded-host") ??
      headerStore.get("x-original-host") ??
      headerStore.get("host")
  );
}

export async function resolveTenantFromHostname(
  hostname: string | null | undefined,
  options?: { allowDefaultFallback?: boolean }
) {
  const normalizedHostname = normalizeTenantHostname(hostname);

  if (normalizedHostname) {
    const byDomain = await getTenantFoundationService().resolveTenant({
      domain: normalizedHostname
    });

    if (byDomain) {
      const matchedSubdomain = extractSubdomainCandidate(normalizedHostname);

      return createResolutionResult({
        tenantId: byDomain.id,
        tenant: byDomain,
        source: matchedSubdomain ? "subdomain" : "custom_domain",
        hostname: normalizedHostname,
        matchedDomain: normalizedHostname,
        matchedSubdomain
      });
    }

    const matchedSubdomain = extractSubdomainCandidate(normalizedHostname);

    if (matchedSubdomain) {
      const bySubdomain = await getTenantFoundationService().resolveTenant({
        slug: matchedSubdomain
      });

      if (bySubdomain) {
        return createResolutionResult({
          tenantId: bySubdomain.id,
          tenant: bySubdomain,
          source: "subdomain",
          hostname: normalizedHostname,
          matchedDomain: normalizedHostname,
          matchedSubdomain
        });
      }
    }
  }

  if (options?.allowDefaultFallback) {
    return buildDefaultTenantResolution(normalizedHostname);
  }

  return null;
}

export async function resolveTenantFromHeaders(
  input: HeaderCarrier,
  options?: { allowDefaultFallback?: boolean }
) {
  return resolveTenantFromHostname(getRequestHostname(input), options);
}

export async function resolveTenantFromServerHeaders(options?: { allowDefaultFallback?: boolean }) {
  const headerStore = await headers();
  return resolveTenantFromHeaders(headerStore, options);
}

export async function resolvePublicTenantFromRequest(
  request: NextRequest,
  options?: { allowDefaultFallback?: boolean }
) {
  const resolved =
    (await resolveTenantFromHeaders(request, {
      allowDefaultFallback: options?.allowDefaultFallback ?? true
    })) ?? (await buildDefaultTenantResolution(getRequestHostname(request)));

  return resolved;
}

export async function resolveTenantFromExtAdminSession(
  session: ExtAdminTenantSessionLike | null | undefined,
  options?: {
    fallbackHostname?: string | null;
    allowDefaultFallback?: boolean;
  }
) {
  const tenantId = session?.tenantId?.trim();

  if (tenantId) {
    const tenant = await resolveTenantRecordById(tenantId);

    if (tenant) {
      return createResolutionResult({
        tenantId,
        tenant,
        source: "extadmin_session",
        hostname: normalizeTenantHostname(options?.fallbackHostname)
      });
    }
  }

  if (options?.fallbackHostname) {
    return resolveTenantFromHostname(options.fallbackHostname, {
      allowDefaultFallback: options.allowDefaultFallback
    });
  }

  if (options?.allowDefaultFallback) {
    return buildDefaultTenantResolution(null);
  }

  return null;
}
