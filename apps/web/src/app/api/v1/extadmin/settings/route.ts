import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../lib/authz";
import { getStoredTenantSettings, updateStoredTenantSettings } from "../../../../../lib/settings-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.settings.write"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
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
