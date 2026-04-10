import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json(
    {
      success: true,
      data: {
        bookingId: "booking_mock_created",
        status: "pending",
        received: body
      },
      meta: {},
      error: null
    },
    { status: 201 }
  );
}
