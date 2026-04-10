import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json(
    {
      success: true,
      data: {
        orderId: "order_mock_checkout",
        orderNumber: "BR-2001",
        status: body.paymentMethod === "cash" ? "placed" : "pending_payment"
      },
      meta: {},
      error: null
    },
    { status: 201 }
  );
}
