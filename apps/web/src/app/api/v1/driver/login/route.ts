import { NextRequest, NextResponse } from "next/server";

import { createDriverSessionToken, getDriverCookieOptions } from "../../../../../lib/driver-auth";
import { getStoredDrivers } from "../../../../../lib/driver-store";
import { getDefaultTenant } from "../../../../../lib/mock-data";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? getDefaultTenant().id);
  const driverId = String(formData.get("driverId") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const driver = (await getStoredDrivers(tenantId)).find(
    (entry) => entry.id === driverId && entry.active && entry.phone === phone
  );

  if (!driver) {
    return NextResponse.redirect(new URL("/driver/login?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/driver", request.url));
  response.cookies.set(
    "driver_session",
    await createDriverSessionToken({ driverId: driver.id, tenantId }),
    getDriverCookieOptions()
  );
  return response;
}
