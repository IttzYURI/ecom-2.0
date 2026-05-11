import { NextRequest, NextResponse } from "next/server";

import { getRuntimeTenantBundle } from "../../../../../lib/content-store";
import { resolvePublicTenantFromRequest } from "../../../../../lib/tenant-resolver";

export async function GET(request: NextRequest) {
  const resolvedTenant = await resolvePublicTenantFromRequest(request);
  const bundle = await getRuntimeTenantBundle(resolvedTenant.tenantId);

  return NextResponse.json({
    success: true,
    data: {
      categories: bundle.categories,
      items: bundle.menuItems,
      optionGroups: bundle.optionGroups
    },
    meta: {},
    error: null
  });
}
