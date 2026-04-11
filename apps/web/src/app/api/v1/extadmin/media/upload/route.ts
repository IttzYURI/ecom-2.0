import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { createStoredMediaAsset } from "../../../../../../lib/media-store";
import { saveUploadedFile } from "../../../../../../lib/uploads";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const label = String(formData.get("label") ?? "").trim();
  const kind = String(formData.get("kind") ?? "gallery").trim() as "gallery" | "hero" | "general";
  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) {
    return NextResponse.redirect(new URL("/extadmin/media", request.url));
  }

  const upload = await saveUploadedFile(file);
  await createStoredMediaAsset(tenantId, {
    label: label || file.name,
    url: upload.url,
    kind
  });

  return NextResponse.redirect(new URL("/extadmin/media", request.url));
}
