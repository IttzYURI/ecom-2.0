import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../lib/extadmin-auth";
import { updateStoredStorefrontContent } from "../../../../../lib/content-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");

  const content = {
    heroTitle: String(formData.get("heroTitle") ?? "").trim(),
    heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim(),
    about: String(formData.get("about") ?? "").trim(),
    galleryImages: Array.from({ length: 6 }, (_, index) =>
      String(formData.get(`galleryImage_${index}`) ?? "").trim()
    ).filter(Boolean),
    faq: [
      {
        question: String(formData.get("faqQuestion1") ?? "").trim(),
        answer: String(formData.get("faqAnswer1") ?? "").trim()
      },
      {
        question: String(formData.get("faqQuestion2") ?? "").trim(),
        answer: String(formData.get("faqAnswer2") ?? "").trim()
      }
    ].filter((entry) => entry.question && entry.answer)
  };

  await updateStoredStorefrontContent(tenantId, content);

  return NextResponse.redirect(new URL("/extadmin/content", request.url));
}
