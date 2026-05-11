import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  createExtAdminSessionToken,
  getExtAdminCookieOptions,
  SESSION_COOKIE_NAME
} from "../../../../../lib/extadmin-auth";
import { PlatformAdminService } from "../../../../../lib/platform-admin-service";
import { getPlatformSession } from "../../../../../lib/platform-auth";
import { validateExtAdminCredentials } from "../../../../../lib/extadmin-user-store";
import { resolvePublicTenantFromRequest } from "../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const platformTenant = String(formData.get("platformTenant") ?? "").trim();
  const platformSession = await getPlatformSession(request);
  const tenantId =
    platformSession && platformTenant
      ? (await new PlatformAdminService().getRestaurant(platformTenant))?.tenant.id ?? ""
      : (await resolvePublicTenantFromRequest(request)).tenantId;
  const user = await validateExtAdminCredentials(email, password, tenantId);

  if (!email || !password || !user) {
    return NextResponse.redirect(new URL("/extadmin/login?error=invalid", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    await createExtAdminSessionToken({
      userId: user.id,
      email: user.email,
      tenantId,
      userType: user.roleIds.includes("role_owner") ? "restaurant_owner" : "restaurant_staff"
    }),
    getExtAdminCookieOptions()
  );

  return NextResponse.redirect(new URL("/extadmin", request.url));
}
