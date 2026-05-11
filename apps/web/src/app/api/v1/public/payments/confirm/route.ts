import { NextRequest, NextResponse } from "next/server";

import { getStoredPayments } from "../../../../../../lib/payments-store";
import { resolvePublicTenantFromRequest } from "../../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;
  const paymentId = String(body.paymentId ?? "");

  if (!paymentId) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "PAYMENT_ID_REQUIRED", message: "A paymentId is required." }
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
        error: { code: "PAYMENT_NOT_FOUND", message: "Payment record could not be found." }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      paymentId: payment.id,
      status: payment.status,
      externalId: payment.externalId
    },
    meta: {},
    error: null
  });
}
