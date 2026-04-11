import { NextResponse } from "next/server";

import { getRuntimeTenantBundle } from "../../../../../lib/content-store";
import { getDefaultTenant } from "../../../../../lib/mock-data";

export async function GET() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
