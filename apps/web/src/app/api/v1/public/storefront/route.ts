import { NextResponse } from "next/server";

import { getDefaultTenant, getTenantBundle } from "../../../../../lib/mock-data";

export async function GET() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return NextResponse.json({
    success: true,
    data: {
      tenant: bundle.tenant,
      content: bundle.content,
      promotions: bundle.promotions,
      reviews: bundle.reviews
    },
    meta: {},
    error: null
  });
}
