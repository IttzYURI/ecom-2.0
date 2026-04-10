import { NextRequest, NextResponse } from "next/server";

import { getDefaultTenant } from "../../../../../../lib/mock-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const postcode = String(body.postcode ?? "").trim().toUpperCase();
  const tenant = getDefaultTenant();
  const deliverable = tenant.deliveryPostcodes.includes(postcode);

  return NextResponse.json({
    success: true,
    data: {
      postcode,
      deliverable,
      deliveryFee: deliverable ? 3.5 : null
    },
    meta: {},
    error: null
  });
}
