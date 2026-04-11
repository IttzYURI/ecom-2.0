import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { updateStoredExtAdminUserRole } from "../../../../../../lib/extadmin-user-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const userId = String(formData.get("userId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "role_manager").trim();

  if (userId && roleId) {
    await updateStoredExtAdminUserRole(tenantId, userId, roleId);
  }

  return NextResponse.redirect(new URL("/extadmin/staff", request.url));
}
