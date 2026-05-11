import { NextRequest, NextResponse } from "next/server";

import { requireDriverAssignedOrder } from "../../../../../../../lib/authz";
import { updateStoredOrderDeliveryStatus } from "../../../../../../../lib/operations-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const { id } = await context.params;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracyMeters = Number(body.accuracyMeters ?? 60);
  const { session, order, response } = await requireDriverAssignedOrder(request, id);

  if (response || !order) {
    return response;
  }

  const deliveryTracking = order.deliveryTracking;

  if (!deliveryTracking) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "DELIVERY_NOT_TRACKABLE",
          message: "Location updates are only allowed for delivery orders."
        }
      },
      { status: 409 }
    );
  }

  if (["delivered", "delivery_failed"].includes(deliveryTracking.deliveryStatus)) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "DELIVERY_INACTIVE", message: "Location updates are only allowed during active delivery." } }, { status: 409 });
  }

  await updateStoredOrderDeliveryStatus(session.tenantId, id, deliveryTracking.deliveryStatus, {
    location: { lat, lng, accuracyMeters }
  });

  return NextResponse.json({ success: true, data: { accepted: true }, meta: {}, error: null });
}
