import { NextResponse } from "next/server";

import { CUSTOMER_SESSION_COOKIE_NAME } from "../../../../../../lib/customer-auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: {
      loggedOut: true
    },
    meta: {},
    error: null
  });

  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0
  });

  return response;
}
