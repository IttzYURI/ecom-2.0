import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { createStoredMediaAsset } from "../../../../../../lib/media-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const kind = String(formData.get("kind") ?? "gallery").trim() as "gallery" | "hero" | "general";

  if (label && url) {
    await createStoredMediaAsset(tenantId, { label, url, kind });
  }

  return NextResponse.redirect(new URL("/extadmin/media", request.url));
}
