import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../../lib/authz";
import { deleteStoredMenuItem } from "../../../../../../../lib/menu-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.menu.write"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (itemId) {
    await deleteStoredMenuItem(tenantId, itemId);
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
