import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../lib/authz";
import { updateStoredReviews } from "../../../../../lib/reviews-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.reviews.write"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;

  const reviews = Array.from({ length: 4 }, (_, index) => ({
    id: String(formData.get(`reviewId_${index}`) ?? `review_${index + 1}`),
    tenantId,
    author: String(formData.get(`reviewAuthor_${index}`) ?? "").trim(),
    rating: Number(formData.get(`reviewRating_${index}`) ?? 5),
    content: String(formData.get(`reviewContent_${index}`) ?? "").trim()
  })).filter((review) => review.author && review.content);

  await updateStoredReviews(tenantId, reviews);

  return NextResponse.redirect(new URL("/extadmin/content", request.url));
}
