import { NextRequest, NextResponse } from "next/server";

import { getPaymentProvider } from "../../../../../../lib/payments";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const provider = getPaymentProvider("stripe");
  const intent = await provider.createPaymentIntent({
    tenantId: body.tenantId ?? "tenant_bella",
    orderId: body.orderId ?? "order_mock_checkout",
    amount: body.amount ?? 3250,
    currency: body.currency ?? "gbp"
  });

  return NextResponse.json({
    success: true,
    data: intent,
    meta: {},
    error: null
  });
}
