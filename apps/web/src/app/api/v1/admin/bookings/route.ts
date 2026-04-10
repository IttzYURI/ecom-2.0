import { NextResponse } from "next/server";

import { getDefaultTenant, getTenantBundle } from "../../../../../lib/mock-data";

export async function GET() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return NextResponse.json({
    success: true,
    data: bundle.bookings,
    meta: {},
    error: null
  });
}
