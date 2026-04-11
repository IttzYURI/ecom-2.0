import { NextResponse } from "next/server";

import { getRuntimeTenantBundle } from "../../../../../lib/content-store";
import { getDefaultTenant } from "../../../../../lib/mock-data";

export async function GET() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
