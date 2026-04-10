import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  return NextResponse.json({
    success: true,
    data: {
      processed: true,
      provider: "stripe",
      eventType: payload.type ?? "unknown"
    },
    meta: {},
    error: null
  });
}
