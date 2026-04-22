import { NextRequest, NextResponse } from "next/server";

import { getDefaultTenant } from "../../../../../../../lib/mock-data";
import { getStoredCustomerOrderTracking } from "../../../../../../../lib/operations-store";
import { serializeOrderTracking } from "../../../../../../../lib/tracking-view";
import { getCustomerSession } from "../../../../../../../lib/customer-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCustomerSession(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view customer tracking."
        }
      },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim() || getDefaultTenant().id;
  const order = await getStoredCustomerOrderTracking(tenantId, session.email, id);

  if (!order) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "TRACKING_NOT_FOUND",
          message: "Tracking information could not be found for that order."
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
