import { NextRequest, NextResponse } from "next/server";

import { getStoredTenantSettings } from "../../../../../../lib/settings-store";
import { getTenantSetupRecord } from "../../../../../../lib/tenant-setup-store";
import { resolvePublicTenantFromRequest } from "../../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const postcode = String(body.postcode ?? "").trim().toUpperCase();
  const resolvedTenant = await resolvePublicTenantFromRequest(request);
  const [tenant, setup] = await Promise.all([
    getStoredTenantSettings(resolvedTenant.tenantId),
    getTenantSetupRecord(resolvedTenant.tenantId)
  ]);
  const deliveryEnabled = setup?.deliveryEnabled ?? true;
  const hasConfiguredPostcodes = tenant.deliveryPostcodes.length > 0;
  const deliverable =
    Boolean(postcode) &&
    deliveryEnabled &&
    (hasConfiguredPostcodes ? tenant.deliveryPostcodes.includes(postcode) : true);

  return NextResponse.json({
    success: true,
    data: {
      postcode,
      deliverable,
      deliveryFee: deliverable ? (setup?.deliveryFee ?? 3.5) : null
    },
    meta: {},
    error: null
  });
}
