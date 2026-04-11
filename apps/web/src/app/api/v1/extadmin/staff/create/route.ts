import { NextRequest, NextResponse } from "next/server";

import { getExtAdminSession, requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { recordAuditEntry } from "../../../../../../lib/audit-store";
import { createStoredExtAdminUser } from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "role_manager").trim();
  const session = await getExtAdminSession(request);

  if (!name || !email || !password) {
    return NextResponse.redirect(
      new URL("/extadmin/staff?status=error&message=Complete+all+staff+fields.", request.url)
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL("/extadmin/staff?status=error&message=Password+must+be+at+least+8+characters.", request.url)
    );
  }

  try {
    await createStoredExtAdminUser(tenantId, {
      name,
      email,
      password,
      roleIds: [roleId]
    });

    await recordAuditEntry(tenantId, {
      action: "staff.create",
      actorEmail: session?.email ?? "unknown",
      target: email,
      summary: `Created staff account for ${name}`
    });

    return NextResponse.redirect(
      new URL("/extadmin/staff?status=success&message=Staff+account+created.", request.url)
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "DUPLICATE_EMAIL"
        ? "A staff account with that email already exists."
        : "Could not create the staff account.";

    return NextResponse.redirect(
      new URL(`/extadmin/staff?status=error&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
