import { NextRequest, NextResponse } from "next/server";

import { getDriverSession } from "../../../../../lib/driver-auth";
import { getStoredDrivers } from "../../../../../lib/driver-store";
import { getStoredOperationsContent } from "../../../../../lib/operations-store";

export async function GET(request: NextRequest) {
  const session = await getDriverSession(request);

  if (!session) {
    return NextResponse.json({ success: false, data: null, meta: {}, error: { code: "UNAUTHORIZED", message: "Driver session required." } }, { status: 401 });
  }

  const driver = (await getStoredDrivers(session.tenantId)).find((entry) => entry.id === session.driverId);
  const operations = await getStoredOperationsContent(session.tenantId);

  return NextResponse.json({
    success: true,
    data: {
      driver,
      orders: operations.orders
    },
    meta: {},
    error: null
  });
}
