import { NextRequest, NextResponse } from "next/server";

import { createStoredInquiry } from "../../../../../lib/inquiries-store";
import { sendEmailNotification } from "../../../../../lib/notifications";
import { getStoredTenantSettings } from "../../../../../lib/settings-store";
import { resolvePublicTenantFromRequest } from "../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CONTACT_FIELDS_REQUIRED",
          message: "Name, email, and message are required."
        }
      },
      { status: 400 }
    );
  }

  const inquiry = await createStoredInquiry(tenantId, { name, email, message });
  const tenant = await getStoredTenantSettings(tenantId);

  if (tenant.email) {
    await sendEmailNotification({
      tenantId,
      to: tenant.email,
      subject: `New contact enquiry from ${name}`,
      text: `${name} (${email}) sent an enquiry:\n\n${message}`
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      inquiryId: inquiry.id,
      received: true
    },
    meta: {},
    error: null
  });
}
