import { NextRequest, NextResponse } from "next/server";

import { getPaymentProvider } from "../../../../../../lib/payments";
import { createStoredPayment } from "../../../../../../lib/payments-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = body.tenantId ?? "tenant_bella";
  const orderId = body.orderId;

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "ORDER_ID_REQUIRED",
          message: "An orderId is required before creating a payment intent."
        }
      },
      { status: 400 }
    );
  }

  const provider = getPaymentProvider("stripe");
  const intent = await provider.createPaymentIntent({
    tenantId,
    orderId,
    amount: body.amount ?? 3250,
    currency: body.currency ?? "gbp"
  });
  const payment = await createStoredPayment(tenantId, {
    orderId,
    provider: "stripe",
    status: "pending",
    amount: body.amount ?? 3250,
    currency: body.currency ?? "gbp",
    externalId: intent.externalId,
    clientSecret: intent.clientSecret
  });

  return NextResponse.json({
    success: true,
    data: {
      ...intent,
      paymentId: payment.id
    },
    meta: {},
    error: null
  });
}
