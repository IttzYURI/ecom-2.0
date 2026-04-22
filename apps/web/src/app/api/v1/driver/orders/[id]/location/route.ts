import { NextRequest, NextResponse } from "next/server";

import { getStoredDrivers } from "../../../../../../../lib/driver-store";
import { getDefaultTenant } from "../../../../../../../lib/mock-data";
import { getStoredOrderById, updateStoredOrderDeliveryStatus } from "../../../../../../../lib/operations-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const tenantId = body.tenantId ?? getDefaultTenant().id;
  const { id } = await context.params;
  const driverId = String(body.driverId ?? "");
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracyMeters = Number(body.accuracyMeters ?? 60);

  const order = await getStoredOrderById(tenantId, id);

  if (!order?.deliveryTracking) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "ORDER_NOT_FOUND", message: "Delivery order not found." } }, { status: 404 });
  }

  const driver = (await getStoredDrivers(tenantId)).find((entry) => entry.id === driverId && entry.active);

  if (!driver || order.deliveryTracking.assignedDriverId !== driver.id) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "DRIVER_NOT_ALLOWED", message: "Only the assigned active driver can update this order location." } }, { status: 403 });
  }

  if (["delivered", "delivery_failed"].includes(order.deliveryTracking.deliveryStatus)) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "DELIVERY_INACTIVE", message: "Location updates are only allowed during active delivery." } }, { status: 409 });
  }

  await updateStoredOrderDeliveryStatus(tenantId, id, order.deliveryTracking.deliveryStatus, {
    location: { lat, lng, accuracyMeters }
  });

  return NextResponse.json({ success: true, data: { accepted: true }, meta: {}, error: null });
}
