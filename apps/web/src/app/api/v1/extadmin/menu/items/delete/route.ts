import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../../lib/extadmin-auth";
import { deleteStoredMenuItem } from "../../../../../../../lib/menu-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (itemId) {
    await deleteStoredMenuItem(tenantId, itemId);
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
