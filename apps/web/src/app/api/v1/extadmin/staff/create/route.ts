import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
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

  if (name && email && password) {
    await createStoredExtAdminUser(tenantId, {
      name,
      email,
      password,
      roleIds: [roleId]
    });
  }

  return NextResponse.redirect(new URL("/extadmin/staff", request.url));
}
