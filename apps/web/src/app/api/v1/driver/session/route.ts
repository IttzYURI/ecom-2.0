import { NextRequest, NextResponse } from "next/server";

import { filterOrdersForDriver, requireDriverActor } from "../../../../../lib/authz";
import { getStoredOperationsContent } from "../../../../../lib/operations-store";

export async function GET(request: NextRequest) {
  const { session, driver, response } = await requireDriverActor(request);

  if (response) {
    return response;
  }

  const operations = await getStoredOperationsContent(session.tenantId);

  return NextResponse.json({
    success: true,
    data: {
      driver,
      orders: filterOrdersForDriver(operations.orders, session.driverId)
    },
    meta: {},
    error: null
  });
}
