import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { deleteStoredMediaAsset } from "../../../../../../lib/media-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const assetId = String(formData.get("assetId") ?? "").trim();

  if (assetId) {
    await deleteStoredMediaAsset(tenantId, assetId);
  }

  return NextResponse.redirect(new URL("/extadmin/media", request.url));
}
