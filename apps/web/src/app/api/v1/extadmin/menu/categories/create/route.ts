import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../../lib/authz";
import { createStoredCategory } from "../../../../../../../lib/menu-store";

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
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visible = formData.get("visible") === "on";

  if (name) {
    await createStoredCategory(tenantId, {
      name,
      slug,
      description,
      visible
    });
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
