import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { hasValidExtAdminSession } from "./lib/extadmin-auth";
import { hasValidPlatformSession } from "./lib/platform-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/platform")) {
    const hasSession = await hasValidPlatformSession(request);
    const isLoginRoute = pathname === "/platform/login";

    if (!hasSession && !isLoginRoute) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }

    if (hasSession && isLoginRoute) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
  }

  if (pathname.startsWith("/extadmin") || pathname.startsWith("/admin")) {
    const hasSession = await hasValidExtAdminSession(request);
    const isLoginRoute = pathname === "/extadmin/login";
    const isInviteRoute = pathname.startsWith("/extadmin/invite/");

    if (!hasSession && !isLoginRoute && !isInviteRoute) {
      return NextResponse.redirect(new URL("/extadmin/login", request.url));
    }

    if (hasSession && isLoginRoute) {
      return NextResponse.redirect(new URL("/extadmin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/extadmin/:path*", "/admin/:path*", "/platform/:path*"]
};
