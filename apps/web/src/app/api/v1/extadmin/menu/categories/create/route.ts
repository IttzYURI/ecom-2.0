import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../../lib/extadmin-auth";
import { createStoredCategory } from "../../../../../../../lib/menu-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
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
