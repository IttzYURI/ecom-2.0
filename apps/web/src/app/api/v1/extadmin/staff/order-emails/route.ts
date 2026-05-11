import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  getStoredExtAdminUserById,
  updateStoredExtAdminUserOrderEmails
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
  const orderEmailsEnabled = String(formData.get("orderEmailsEnabled") ?? "false") === "true";

  if (userId) {
    const user = await getStoredExtAdminUserById(tenantId, userId);
    await updateStoredExtAdminUserOrderEmails(tenantId, userId, orderEmailsEnabled);

    if (user) {
      await recordAuditEntry(tenantId, {
        action: "staff.order_emails.update",
        actorEmail: session?.email ?? "unknown",
        target: user.email,
        summary: `${orderEmailsEnabled ? "Enabled" : "Disabled"} order emails for ${user.name}`
      });
    }
  }

  return NextResponse.redirect(
    new URL(
      `/extadmin/staff?status=success&message=${encodeURIComponent("Order email recipients updated.")}`,
      request.url
    )
  );
}
