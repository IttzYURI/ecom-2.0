import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { assignStoredOrderDriver } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
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
