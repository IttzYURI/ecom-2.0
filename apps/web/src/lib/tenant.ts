import { headers } from "next/headers";

import { getDefaultTenant, getTenantBySlug } from "./mock-data";

export async function resolveTenantFromRequest() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const pathnameHint = headerStore.get("x-pathname") ?? "";
  const subdomain = host.split(".")[0];
  const pathSlug = pathnameHint.split("/").filter(Boolean)[0];

  return (
    getTenantBySlug(subdomain) ??
    getTenantBySlug(pathSlug) ??
    getDefaultTenant()
  );
}
