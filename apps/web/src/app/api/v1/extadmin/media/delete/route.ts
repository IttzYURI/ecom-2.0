import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { deleteStoredMediaAsset } from "../../../../../../lib/media-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.media.write"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const assetId = String(formData.get("assetId") ?? "").trim();

  if (assetId) {
    await deleteStoredMediaAsset(tenantId, assetId);
  }

  return NextResponse.redirect(new URL("/extadmin/media", request.url));
}
