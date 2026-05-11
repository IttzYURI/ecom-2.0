import { NextRequest, NextResponse } from "next/server";

import { updateStoredOrderPayment } from "../../../../../lib/operations-store";
import {
  findStoredPaymentByExternalId,
  updateStoredPaymentStatus
} from "../../../../../lib/payments-store";
import { verifyStripeWebhook } from "../../../../../lib/payments";
import { ensureAutoPrintJobForOrder } from "../../../../../lib/printing-service";

export async function POST(request: NextRequest) {
  const rawPayload = await request.text();
  const signature = request.headers.get("stripe-signature");

  let payload;
  try {
    payload = await verifyStripeWebhook(rawPayload, signature);
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "WEBHOOK_SIGNATURE_INVALID", message: "Webhook signature verification failed." }
      },
      { status: 400 }
    );
  }

  const eventType = payload.type ?? "unknown";
  const object = (payload.data?.object ?? {}) as {
    id?: string;
    metadata?: Record<string, unknown>;
  };
  const tenantIdHint =
    typeof object.metadata?.tenantId === "string" && object.metadata.tenantId.trim()
      ? object.metadata.tenantId.trim()
      : undefined;
  const externalId = typeof object.id === "string" ? object.id : undefined;

  if (
    externalId &&
    (eventType === "payment_intent.succeeded" ||
      eventType === "payment_intent.payment_failed")
  ) {
    const payment = await findStoredPaymentByExternalId(externalId, tenantIdHint);

    if (payment) {
      const nextStatus = eventType === "payment_intent.succeeded" ? "paid" : "failed";

      if (payment.status === nextStatus) {
        return NextResponse.json({
          success: true,
          data: { processed: true, provider: "stripe", eventType, idempotent: true },
          meta: {},
          error: null
        });
      }

      await updateStoredPaymentStatus(payment.tenantId, payment.id, nextStatus);
      await updateStoredOrderPayment(payment.tenantId, payment.orderId, {
        paymentStatus: nextStatus,
        orderStatus: nextStatus === "paid" ? "placed" : "pending_payment"
      });

      if (nextStatus === "paid") {
        await ensureAutoPrintJobForOrder(payment.tenantId, payment.orderId);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { processed: true, provider: "stripe", eventType },
    meta: {},
    error: null
  });
}
