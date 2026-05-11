import { NextRequest, NextResponse } from "next/server";

import { getStoredOrderByTrackingToken } from "../../../../../../lib/operations-store";
import { resolvePublicTenantFromRequest } from "../../../../../../lib/tenant-resolver";
import { serializeOrderTracking } from "../../../../../../lib/tracking-view";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "TRACKING_TOKEN_REQUIRED",
          message: "A tracking token is required."
        }
      },
      { status: 400 }
    );
  }

  const order = await getStoredOrderByTrackingToken(tenantId, token);

  if (!order || !order.deliveryTracking) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "TRACKING_NOT_FOUND",
          message: "That tracking link is invalid or has expired."
        }
      },
      { status: 404 }
    );
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
