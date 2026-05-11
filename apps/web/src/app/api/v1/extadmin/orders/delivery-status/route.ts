import { NextRequest, NextResponse } from "next/server";

import type { DeliveryStatus } from "@rcc/contracts";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { updateStoredOrderDeliveryStatus } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.orders.manage"
  );

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const orderId = String(formData.get("orderId") ?? "");
  const deliveryStatus = String(formData.get("deliveryStatus") ?? "awaiting_dispatch") as DeliveryStatus;
  const etaMinutesRaw = String(formData.get("etaMinutes") ?? "").trim();

  await updateStoredOrderDeliveryStatus(tenantId, orderId, deliveryStatus, {
    etaMinutes: etaMinutesRaw ? Number(etaMinutesRaw) : undefined
  });

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
