import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermissionApi } from "../../../../../lib/authz";
import { getTenantBundle } from "../../../../../lib/mock-data";

export async function GET(request: NextRequest) {
  const { response, session } = await requireExtAdminPermissionApi(
    request,
    "tenant.dashboard.read"
  );

  if (response) {
    return response;
  }

  const bundle = getTenantBundle(session.tenantId);

  return NextResponse.json({
    success: true,
    data: bundle.orders,
    meta: {},
    error: null
  });
}
