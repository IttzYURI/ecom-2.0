import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { hasValidExtAdminSession } from "./lib/extadmin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/extadmin")) {
    return NextResponse.next();
  }

  const hasSession = await hasValidExtAdminSession(request);
  const isLoginRoute = pathname === "/extadmin/login";

  if (!hasSession && !isLoginRoute) {
    return NextResponse.redirect(new URL("/extadmin/login", request.url));
  }

  if (hasSession && isLoginRoute) {
    return NextResponse.redirect(new URL("/extadmin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/extadmin/:path*"]
};
