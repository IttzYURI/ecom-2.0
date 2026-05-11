import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../../lib/authz";
import { createStoredMenuItem } from "../../../../../../../lib/menu-store";

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
  const image = String(formData.get("image") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const basePrice = Number(formData.get("basePrice") ?? 0);
  const featured = formData.get("featured") === "on";
  const bestSeller = formData.get("bestSeller") === "on";
  const available = formData.get("available") === "on";

  if (name && categoryId) {
    await createStoredMenuItem(tenantId, {
      name,
      slug,
      description,
      image:
        image ||
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      basePrice,
      categoryIds: [categoryId],
      featured,
      bestSeller,
      available
    });
  }

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
