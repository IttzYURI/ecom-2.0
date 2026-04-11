import { NextRequest, NextResponse } from "next/server";

import { updateStoredOrderPayment } from "../../../../../lib/operations-store";
import {
  getStoredPaymentByExternalId,
  updateStoredPaymentStatus
} from "../../../../../lib/payments-store";
import { verifyStripeWebhook } from "../../../../../lib/payments";

export async function POST(request: NextRequest) {
  const rawPayload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const payload = await verifyStripeWebhook(rawPayload, signature);
  const eventType = payload.type ?? "unknown";
  const object = (payload.data?.object ?? {}) as {
    id?: string;
    metadata?: Record<string, unknown>;
  };
  const tenantId =
    typeof object.metadata === "object" && object.metadata
      ? String(object.metadata.tenantId ?? "tenant_bella")
      : "tenant_bella";
  const externalId = typeof object.id === "string" ? object.id : undefined;

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
