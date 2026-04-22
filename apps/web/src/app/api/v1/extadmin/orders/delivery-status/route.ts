import { NextRequest, NextResponse } from "next/server";

import type { DeliveryStatus } from "@rcc/contracts";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { updateStoredOrderDeliveryStatus } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const orderId = String(formData.get("orderId") ?? "");
  const deliveryStatus = String(formData.get("deliveryStatus") ?? "awaiting_dispatch") as DeliveryStatus;
  const etaMinutesRaw = String(formData.get("etaMinutes") ?? "").trim();

  await updateStoredOrderDeliveryStatus(tenantId, orderId, deliveryStatus, {
    etaMinutes: etaMinutesRaw ? Number(etaMinutesRaw) : undefined
  });

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
