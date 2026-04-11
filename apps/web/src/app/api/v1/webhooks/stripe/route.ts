import { NextRequest, NextResponse } from "next/server";

import { updateStoredOrderPayment } from "../../../../../lib/operations-store";
import {
  getStoredPaymentByExternalId,
  updateStoredPaymentStatus
} from "../../../../../lib/payments-store";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const eventType = payload.type ?? "unknown";
  const object = payload.data?.object ?? {};
  const tenantId = object.metadata?.tenantId ?? "tenant_bella";
  const externalId = object.id;

  if (
    externalId &&
    (eventType === "payment_intent.succeeded" ||
      eventType === "payment_intent.payment_failed")
  ) {
    const payment = await getStoredPaymentByExternalId(tenantId, externalId);

    if (payment) {
      const nextStatus = eventType === "payment_intent.succeeded" ? "paid" : "failed";
      await updateStoredPaymentStatus(tenantId, payment.id, nextStatus);
      await updateStoredOrderPayment(tenantId, payment.orderId, {
        paymentStatus: nextStatus,
        orderStatus: nextStatus === "paid" ? "placed" : "pending_payment"
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      processed: true,
      provider: "stripe",
      eventType
    },
    meta: {},
    error: null
  });
}
