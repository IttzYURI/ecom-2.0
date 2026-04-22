import { NextRequest, NextResponse } from "next/server";

import { DRIVER_SESSION_COOKIE_NAME, getDriverCookieOptions } from "../../../../../lib/driver-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/driver/login", request.url));
  response.cookies.set(DRIVER_SESSION_COOKIE_NAME, "", {
    ...getDriverCookieOptions(),
    maxAge: 0
  });
  return response;
}
