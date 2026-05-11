import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { createStoredMediaAsset } from "../../../../../../lib/media-store";

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
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const kind = String(formData.get("kind") ?? "gallery").trim() as "gallery" | "hero" | "general";

  if (label && url) {
    await createStoredMediaAsset(tenantId, { label, url, kind });
  }

  return NextResponse.redirect(new URL("/extadmin/media", request.url));
}
