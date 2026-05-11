import { NextRequest, NextResponse } from "next/server";

import { requireTenantFeature } from "../../../../../lib/feature-gating";
import { sendEmailNotification } from "../../../../../lib/notifications";
import { createStoredBooking } from "../../../../../lib/operations-store";
import { getStoredTenantSettings } from "../../../../../lib/settings-store";
import { resolvePublicTenantFromRequest } from "../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;

  const { allowed } = await requireTenantFeature(tenantId, "tableBooking");

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "BOOKINGS_DISABLED", message: "Table bookings are not available for this restaurant." }
      },
      { status: 403 }
    );
  }

  const tenant = await getStoredTenantSettings(tenantId);
  const booking = await createStoredBooking(tenantId, {
    customerName: body.customerName ?? "Guest",
    email: body.email ?? "",
    phone: body.phone ?? "",
    partySize: Number(body.partySize ?? 2),
    bookingDate: body.bookingDate ?? new Date().toISOString().slice(0, 10),
    bookingTime: body.bookingTime ?? "19:00",
    notes: body.notes ?? "",
    status: "pending"
  });

  if (tenant.email) {
    await sendEmailNotification({
      tenantId,
      to: tenant.email,
      subject: `New booking request from ${booking.customerName}`,
      text: `${booking.customerName} requested a table for ${booking.partySize} on ${booking.bookingDate} at ${booking.bookingTime}.`
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status
      },
      meta: {},
      error: null
    },
    { status: 201 }
  );
}
