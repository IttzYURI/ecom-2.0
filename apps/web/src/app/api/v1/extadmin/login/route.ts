import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  createExtAdminSessionToken,
  getExtAdminCookieOptions,
  SESSION_COOKIE_NAME
} from "../../../../../lib/extadmin-auth";
import { validateExtAdminUser } from "../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || !(await validateExtAdminUser(email, password))) {
    return NextResponse.redirect(new URL("/extadmin/login?error=invalid", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    await createExtAdminSessionToken(email),
    getExtAdminCookieOptions()
  );

  return NextResponse.redirect(new URL("/extadmin", request.url));
}
