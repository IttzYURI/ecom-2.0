import { NextRequest, NextResponse } from "next/server";

import { requireTenantFeature } from "../../../../../../lib/feature-gating";
import { getStoredOrderById } from "../../../../../../lib/operations-store";
import { getPaymentProvider } from "../../../../../../lib/payments";
import { createStoredPayment } from "../../../../../../lib/payments-store";
import { getStoredTenantSettings } from "../../../../../../lib/settings-store";
import { resolvePublicTenantFromRequest } from "../../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;
  const orderId = String(body.orderId ?? "");

  const { allowed } = await requireTenantFeature(tenantId, "cardPayment");

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "CARD_PAYMENT_DISABLED", message: "Card payments are not available for this restaurant." }
      },
      { status: 403 }
    );
  }

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "ORDER_ID_REQUIRED", message: "An orderId is required before creating a payment intent." }
      },
      { status: 400 }
    );
  }

  const order = await getStoredOrderById(tenantId, orderId);

  if (!order) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "ORDER_NOT_FOUND", message: "Order could not be found." }
      },
      { status: 404 }
    );
  }

  if (order.orderStatus !== "pending_payment") {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "ORDER_NOT_PENDING", message: "Payment can only be created for orders awaiting payment." }
      },
      { status: 400 }
    );
  }

  const tenant = await getStoredTenantSettings(tenantId);
  const currency = "gbp";
  const amountMinor = Math.round(order.total * 100);

  const provider = getPaymentProvider("stripe");
  const intent = await provider.createPaymentIntent({
    tenantId,
    orderId,
    amount: amountMinor,
    currency
  });

  const payment = await createStoredPayment(tenantId, {
    orderId,
    provider: "stripe",
    status: "pending",
    amount: amountMinor,
    currency,
    externalId: intent.externalId,
    clientSecret: intent.clientSecret
  });

  return NextResponse.json({
    success: true,
    data: {
      ...intent,
      paymentId: payment.id,
      amountMinor,
      currency
    },
    meta: {},
    error: null
  });
}
