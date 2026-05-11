import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  createPlatformSessionToken,
  getPlatformCookieOptions,
  PLATFORM_SESSION_COOKIE_NAME,
  validatePlatformCredentials
} from "../../../../../lib/platform-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!validatePlatformCredentials(email, password)) {
    return NextResponse.redirect(new URL("/platform/login?error=invalid", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    PLATFORM_SESSION_COOKIE_NAME,
    await createPlatformSessionToken(email),
    getPlatformCookieOptions()
  );

  return NextResponse.redirect(new URL("/platform", request.url));
}
