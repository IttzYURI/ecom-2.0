import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../lib/extadmin-auth";
import { getStoredTenantSettings, updateStoredTenantSettings } from "../../../../../lib/settings-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const current = await getStoredTenantSettings(tenantId);

  const updated = {
    ...current,
    name: String(formData.get("name") ?? current.name).trim(),
    cuisine: String(formData.get("cuisine") ?? current.cuisine).trim(),
    phone: String(formData.get("phone") ?? current.phone).trim(),
    email: String(formData.get("email") ?? current.email).trim(),
    address: String(formData.get("address") ?? current.address).trim(),
    description: String(formData.get("description") ?? current.description).trim(),
    deliveryPostcodes: String(
      formData.get("deliveryPostcodes") ?? current.deliveryPostcodes.join(", ")
    )
      .split(",")
      .map((postcode) => postcode.trim())
      .filter(Boolean)
  };

  await updateStoredTenantSettings(tenantId, updated);

  return NextResponse.redirect(new URL("/extadmin/settings", request.url));
}
