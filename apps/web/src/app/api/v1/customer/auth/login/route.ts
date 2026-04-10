import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    data: {
      accessToken: `mock-access-token-for-${body.email ?? "customer"}`,
      refreshToken: "mock-refresh-token",
      user: {
        id: "customer_1",
        email: body.email ?? "customer@example.com"
      }
    },
    meta: {},
    error: null
  });
}
