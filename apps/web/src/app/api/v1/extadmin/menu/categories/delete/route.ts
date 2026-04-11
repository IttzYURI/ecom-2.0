import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../../lib/extadmin-auth";
import { deleteStoredCategory } from "../../../../../../../lib/menu-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (categoryId) {
    await deleteStoredCategory(tenantId, categoryId);
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
