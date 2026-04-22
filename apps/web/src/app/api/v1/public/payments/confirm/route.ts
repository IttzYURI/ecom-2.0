import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { updateStoredOrderPayment } from "../../../../../../lib/operations-store";
import { getStoredPayments, updateStoredPaymentStatus } from "../../../../../../lib/payments-store";

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia"
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = body.tenantId ?? "tenant_bella";
  const paymentId = String(body.paymentId ?? "");

  if (!paymentId) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PAYMENT_ID_REQUIRED",
          message: "A paymentId is required."
        }
      },
      { status: 400 }
    );
  }

  const payment = (await getStoredPayments(tenantId)).find((entry) => entry.id === paymentId);

  if (!payment) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PAYMENT_NOT_FOUND",
          message: "Payment record could not be found."
        }
      },
      { status: 404 }
    );
  }

  if (payment.externalId.startsWith("pi_mock_")) {
    await updateStoredPaymentStatus(tenantId, payment.id, "paid");
    await updateStoredOrderPayment(tenantId, payment.orderId, {
      paymentStatus: "paid",
      orderStatus: "placed"
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: "paid",
        mode: "mock"
      },
      meta: {},
      error: null
    });
  }

  const stripe = getStripeClient();

  if (!stripe || !String(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PAYMENT_CONFIRMATION_UNAVAILABLE",
          message: "Stripe card confirmation requires a test-mode Stripe setup or a frontend card form."
        }
      },
      { status: 400 }
    );
  }

  const intent = await stripe.paymentIntents.confirm(payment.externalId, {
    payment_method: "pm_card_visa"
  });
  const nextStatus = intent.status === "succeeded" ? "paid" : "failed";

  await updateStoredPaymentStatus(tenantId, payment.id, nextStatus);
  await updateStoredOrderPayment(tenantId, payment.orderId, {
    paymentStatus: nextStatus,
    orderStatus: nextStatus === "paid" ? "placed" : "pending_payment"
  });

  return NextResponse.json({
    success: true,
    data: {
      paymentId: payment.id,
      status: nextStatus,
      mode: "stripe-test"
    },
    meta: {},
    error: null
  });
}
