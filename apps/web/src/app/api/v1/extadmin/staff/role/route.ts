import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  getStoredExtAdminUserById,
  updateStoredExtAdminUserOrderEmails,
  updateStoredExtAdminUserRole
} from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.staff.manage"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const userId = String(formData.get("userId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "role_manager").trim();
  const orderEmailsEnabled = formData.has("orderEmailsEnabled");

  if (userId && roleId) {
    const user = await getStoredExtAdminUserById(tenantId, userId);
    await updateStoredExtAdminUserRole(tenantId, userId, roleId);
    await updateStoredExtAdminUserOrderEmails(tenantId, userId, orderEmailsEnabled);

    if (user) {
      await recordAuditEntry(tenantId, {
        action: "staff.role.update",
        actorEmail: session?.email ?? "unknown",
        target: user.email,
        summary: `Assigned role ${roleId} to ${user.name} and set order emails ${orderEmailsEnabled ? "on" : "off"}`
      });
    }
  }

  return NextResponse.redirect(
    new URL("/extadmin/staff?status=success&message=Access+settings+updated.", request.url)
  );
}
