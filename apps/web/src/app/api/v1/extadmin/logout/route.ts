import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "../../../../../lib/extadmin-auth";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.redirect(new URL("/extadmin/login", request.url));
}
