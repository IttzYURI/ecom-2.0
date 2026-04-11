import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { updateBookingStatus } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "pending");

  await updateBookingStatus(tenantId, bookingId, status as never);

  return NextResponse.redirect(new URL("/extadmin/bookings", request.url));
}
