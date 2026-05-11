import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { createManualReprintJob } from "../../../../../../lib/printing-service";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.print.manage"
  );

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "Manual reprint from extadmin");

  if (orderId) {
    await createManualReprintJob(
      tenantId,
      orderId,
      {
        copyType: "kitchen",
        reason
      },
      session?.email
    );
  }

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
