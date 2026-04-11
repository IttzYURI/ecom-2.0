import { NextRequest, NextResponse } from "next/server";

import { getExtAdminSession, requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  getStoredExtAdminUserById,
  resetStoredExtAdminUserPassword
} from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const session = await getExtAdminSession(request);

  if (!userId || !password) {
    return NextResponse.redirect(
      new URL("/extadmin/staff?status=error&message=Enter+a+new+password+before+saving.", request.url)
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL("/extadmin/staff?status=error&message=Password+must+be+at+least+8+characters.", request.url)
    );
  }

  const user = await getStoredExtAdminUserById(tenantId, userId);
  await resetStoredExtAdminUserPassword(tenantId, userId, password);

  if (user) {
    await recordAuditEntry(tenantId, {
      action: "staff.password.reset",
      actorEmail: session?.email ?? "unknown",
      target: user.email,
      summary: `Reset password for ${user.name}`
    });
  }

  return NextResponse.redirect(
    new URL("/extadmin/staff?status=success&message=Password+updated.", request.url)
  );
}
