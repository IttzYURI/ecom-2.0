import { NextRequest, NextResponse } from "next/server";

import type { DeliveryStatus } from "@rcc/contracts";

import { getStoredDrivers } from "../../../../../../../lib/driver-store";
import { getDefaultTenant } from "../../../../../../../lib/mock-data";
import { getStoredOrderById, updateStoredOrderDeliveryStatus } from "../../../../../../../lib/operations-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const contentType = request.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  const tenantId = body.tenantId ?? getDefaultTenant().id;
  const { id } = await context.params;
  const driverId = String(body.driverId ?? "");
  const deliveryStatus = String(body.deliveryStatus ?? "") as DeliveryStatus;

  const order = await getStoredOrderById(tenantId, id);

  if (!order?.deliveryTracking) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "ORDER_NOT_FOUND", message: "Delivery order not found." } }, { status: 404 });
  }

  const driver = (await getStoredDrivers(tenantId)).find((entry) => entry.id === driverId && entry.active);

  if (!driver || order.deliveryTracking.assignedDriverId !== driver.id) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "DRIVER_NOT_ALLOWED", message: "Only the assigned active driver can update this delivery." } }, { status: 403 });
  }

  await updateStoredOrderDeliveryStatus(tenantId, id, deliveryStatus);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: true, data: { accepted: true }, meta: {}, error: null });
  }

  return NextResponse.redirect(new URL("/driver", request.url));
}
