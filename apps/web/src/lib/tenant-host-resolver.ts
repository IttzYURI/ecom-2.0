import type { NextRequest } from "next/server";

import { getDefaultTenant, getTenantBySlug, listTenants } from "./mock-data";

const DEFAULT_PLATFORM_HOSTS = ["platform.test", "localhost", "127.0.0.1"];

type HeaderCarrier = Headers | Pick<NextRequest, "headers">;

function getHeadersBag(input: HeaderCarrier) {
  return input instanceof Headers ? input : input.headers;
}

function getConfiguredPlatformHosts() {
  const configuredHosts = String(process.env.TENANT_PLATFORM_HOSTS ?? "")
    .split(",")
    .map((entry) => normalizeTenantHostname(entry))
    .filter(Boolean);

  return configuredHosts.length ? configuredHosts : DEFAULT_PLATFORM_HOSTS;
}

function parseConfiguredCustomDomains() {
  return String(process.env.TENANT_CUSTOM_DOMAIN_MAP ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [domainPart, tenantIdPart] = entry.split("=");
      const domain = normalizeTenantHostname(domainPart ?? "");
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

export function resolveTenantIdFromHostname(
  hostname: string | null | undefined,
  options?: { allowDefaultFallback?: boolean }
) {
  const normalizedHostname = normalizeTenantHostname(hostname);

  if (normalizedHostname) {
    const customDomain = parseConfiguredCustomDomains().find(
      (entry) => entry.domain === normalizedHostname
    );

    if (customDomain) {
      return customDomain.tenantId;
    }

    const subdomainCandidate = extractSubdomainCandidate(normalizedHostname);

    if (subdomainCandidate) {
      return getTenantBySlug(subdomainCandidate)?.id ?? null;
    }

    const exactTenant = listTenants().find((tenant) => {
      const defaultDomain = `${tenant.subdomain}.${DEFAULT_PLATFORM_HOSTS[0]}`;
      return normalizedHostname === defaultDomain;
    });

    if (exactTenant) {
      return exactTenant.id;
    }
  }

  if (options?.allowDefaultFallback) {
    return getDefaultTenant().id;
  }

  return null;
}

export function resolveTenantIdFromExtAdminSession(
  session: { tenantId?: string | null } | null | undefined,
  options?: {
    fallbackHostname?: string | null;
    allowDefaultFallback?: boolean;
  }
) {
  const tenantId = session?.tenantId?.trim();

  if (tenantId) {
    return tenantId;
  }

  if (options?.fallbackHostname) {
    return resolveTenantIdFromHostname(options.fallbackHostname, {
      allowDefaultFallback: options.allowDefaultFallback
    });
  }

  if (options?.allowDefaultFallback) {
    return getDefaultTenant().id;
  }

  return null;
}
