import { NextRequest, NextResponse } from "next/server";

import type { DeliveryStatus } from "@rcc/contracts";

import { requireDriverAssignedOrder } from "../../../../../../../lib/authz";
import { updateStoredOrderDeliveryStatus } from "../../../../../../../lib/operations-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const contentType = request.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  const { id } = await context.params;
  const deliveryStatus = String(body.deliveryStatus ?? "") as DeliveryStatus;
  const { session, response } = await requireDriverAssignedOrder(request, id);

  if (response) {
    return response;
  }

  await updateStoredOrderDeliveryStatus(session.tenantId, id, deliveryStatus);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: true, data: { accepted: true }, meta: {}, error: null });
  }

  return NextResponse.redirect(new URL("/driver", request.url));
}
