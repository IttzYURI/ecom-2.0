import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { createStoredMediaAsset } from "../../../../../../lib/media-store";
import { saveUploadedFile } from "../../../../../../lib/uploads";

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
