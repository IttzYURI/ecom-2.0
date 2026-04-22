import { NextRequest, NextResponse } from "next/server";

import { getCustomerSession } from "../../../../../lib/customer-auth";

export async function GET(request: NextRequest) {
  const session = await getCustomerSession(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CUSTOMER_SESSION_MISSING",
          message: "No active customer session."
        }
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: session.id,
        email: session.email,
        name: session.name
      }
    },
    meta: {},
    error: null
  });
}
