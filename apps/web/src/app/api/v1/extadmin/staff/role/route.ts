import { NextRequest, NextResponse } from "next/server";

import { getExtAdminSession, requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  getStoredExtAdminUserById,
  updateStoredExtAdminUserRole
} from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const userId = String(formData.get("userId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "role_manager").trim();
  const session = await getExtAdminSession(request);

  if (userId && roleId) {
    const user = await getStoredExtAdminUserById(tenantId, userId);
    await updateStoredExtAdminUserRole(tenantId, userId, roleId);

    if (user) {
      await recordAuditEntry(tenantId, {
        action: "staff.role.update",
        actorEmail: session?.email ?? "unknown",
        target: user.email,
        summary: `Assigned role ${roleId} to ${user.name}`
      });
    }
  }

  return NextResponse.redirect(
    new URL("/extadmin/staff?status=success&message=Role+assignment+updated.", request.url)
  );
}
