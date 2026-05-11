import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { assignStoredOrderDriver } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.orders.assign_driver"
  );

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const orderId = String(formData.get("orderId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const etaMinutesRaw = String(formData.get("etaMinutes") ?? "").trim();

  await assignStoredOrderDriver(
    tenantId,
    orderId,
    driverId,
    etaMinutesRaw ? Number(etaMinutesRaw) : undefined
  );

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
