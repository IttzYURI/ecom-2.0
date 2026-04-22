import { NextRequest, NextResponse } from "next/server";

import { getExtAdminSession, requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import {
  getStoredExtAdminUserById,
  updateStoredExtAdminUserOrderEmails
} from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const userId = String(formData.get("userId") ?? "").trim();
  const orderEmailsEnabled = String(formData.get("orderEmailsEnabled") ?? "false") === "true";
  const session = await getExtAdminSession(request);

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
