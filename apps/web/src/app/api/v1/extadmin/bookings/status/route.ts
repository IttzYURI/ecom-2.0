import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { updateBookingStatus } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.bookings.manage"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "pending");

  await updateBookingStatus(tenantId, bookingId, status as never);

  return NextResponse.redirect(new URL("/extadmin/bookings", request.url));
}
