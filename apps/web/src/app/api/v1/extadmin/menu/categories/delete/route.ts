import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../../lib/authz";
import { deleteStoredCategory } from "../../../../../../../lib/menu-store";

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
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (categoryId) {
    await deleteStoredCategory(tenantId, categoryId);
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
