import { NextResponse } from "next/server";

import { getDefaultTenant, getTenantBundle } from "../../../../../lib/mock-data";

export async function GET() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return NextResponse.json({
    success: true,
    data: {
      categories: bundle.categories,
      items: bundle.menuItems,
      optionGroups: bundle.optionGroups
    },
    meta: {},
    error: null
  });
}
