import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      paymentProviders: ["stripe"],
      featureFlags: ["tenant-impersonation", "menu-modifiers", "booking-workflow"]
    },
    meta: {},
    error: null
  });
}
