import { NextRequest, NextResponse } from "next/server";

import {
  createExtAdminSessionToken,
  getExtAdminCookieOptions,
  SESSION_COOKIE_NAME
} from "../../../../../../lib/extadmin-auth";
import {
  getExtAdminInviteByToken,
  markExtAdminInviteAccepted
} from "../../../../../../lib/extadmin-invite-store";
import {
  getStoredExtAdminUserById,
  resetStoredExtAdminUserPassword
} from "../../../../../../lib/extadmin-user-store";

function redirectToInvite(request: NextRequest, token: string, error: string) {
  return NextResponse.redirect(
    new URL(`/extadmin/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(error)}`, request.url)
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return NextResponse.redirect(new URL("/extadmin/login", request.url));
  }

  if (password.length < 8) {
    return redirectToInvite(request, token, "PASSWORD_TOO_SHORT");
  }

  if (password !== confirmPassword) {
    return redirectToInvite(request, token, "PASSWORD_MISMATCH");
  }

  const invite = await getExtAdminInviteByToken(token);

  if (!invite || invite.status !== "pending") {
    return redirectToInvite(request, token, "INVITE_INVALID");
  }

  const user = await getStoredExtAdminUserById(invite.tenantId, invite.userId);

  if (!user) {
    return redirectToInvite(request, token, "INVITE_USER_MISSING");
  }

  await resetStoredExtAdminUserPassword(invite.tenantId, invite.userId, password);
  await markExtAdminInviteAccepted(invite.tenantId, invite.id);

  const response = NextResponse.redirect(new URL("/extadmin", request.url));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createExtAdminSessionToken({
      userId: user.id,
      email: user.email,
      tenantId: invite.tenantId,
      userType: user.roleIds.includes("role_owner") ? "restaurant_owner" : "restaurant_staff"
    }),
    getExtAdminCookieOptions()
  );

  return response;
}
