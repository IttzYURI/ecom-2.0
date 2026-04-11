import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../lib/extadmin-auth";
import { getStoredMenuContent, updateStoredMenuContent } from "../../../../../lib/menu-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const existing = await getStoredMenuContent(tenantId);

  const categories = existing.categories.map((category, index) => ({
    ...category,
    name: String(formData.get(`categoryName_${index}`) ?? category.name).trim(),
    slug: String(formData.get(`categorySlug_${index}`) ?? category.slug).trim(),
    description: String(
      formData.get(`categoryDescription_${index}`) ?? category.description
    ).trim(),
    visible: formData.get(`categoryVisible_${index}`) === "on"
  }));

  const menuItems = existing.menuItems.map((item, index) => ({
    ...item,
    categoryIds: [
      String(formData.get(`itemCategoryId_${index}`) ?? item.categoryIds[0] ?? "").trim()
    ].filter(Boolean),
    name: String(formData.get(`itemName_${index}`) ?? item.name).trim(),
    slug: String(formData.get(`itemSlug_${index}`) ?? item.slug).trim(),
    description: String(
      formData.get(`itemDescription_${index}`) ?? item.description
    ).trim(),
    image: String(formData.get(`itemImage_${index}`) ?? item.image).trim(),
    basePrice: Number(formData.get(`itemPrice_${index}`) ?? item.basePrice),
    available: formData.get(`itemAvailable_${index}`) === "on",
    featured: formData.get(`itemFeatured_${index}`) === "on",
    bestSeller: formData.get(`itemBestSeller_${index}`) === "on"
  }));

  await updateStoredMenuContent(tenantId, { categories, menuItems });

  return NextResponse.redirect(new URL("/extadmin/menu", request.url));
}
