import { NextRequest, NextResponse } from "next/server";

import { requireCustomerOrderAccess } from "../../../../../../../lib/authz";
import { serializeOrderTracking } from "../../../../../../../lib/tracking-view";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { order, response } = await requireCustomerOrderAccess(request, id);

  if (response || !order) {
    return response;
  }

  return NextResponse.json({
    success: true,
    data: serializeOrderTracking(order),
    meta: {
      pollIntervalMs: 15000
    },
    error: null
  });
}
