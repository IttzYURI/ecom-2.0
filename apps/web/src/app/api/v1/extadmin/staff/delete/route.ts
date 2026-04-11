import { NextRequest, NextResponse } from "next/server";

import { getExtAdminSession, requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  deleteStoredExtAdminUser,
  getStoredExtAdminUserById
} from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const userId = String(formData.get("userId") ?? "").trim();
  const session = await getExtAdminSession(request);

  if (userId) {
    const user = await getStoredExtAdminUserById(tenantId, userId);
    const deleted = await deleteStoredExtAdminUser(tenantId, userId);

    if (deleted && user) {
      await recordAuditEntry(tenantId, {
        action: "staff.delete",
        actorEmail: session?.email ?? "unknown",
        target: user.email,
        summary: `Removed staff access for ${user.name}`
      });
    }

    if (!deleted) {
      return NextResponse.redirect(
        new URL("/extadmin/staff?status=error&message=Primary+owner+access+cannot+be+removed.", request.url)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/extadmin/staff?status=success&message=Staff+access+updated.", request.url)
  );
}
