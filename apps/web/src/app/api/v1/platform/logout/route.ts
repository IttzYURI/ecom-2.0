import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_SESSION_COOKIE_NAME } from "../../../../../lib/platform-auth";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_SESSION_COOKIE_NAME);

  return NextResponse.redirect(new URL("/platform/login", request.url));
}
