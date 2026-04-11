import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { updateOrderStatus } from "../../../../../../lib/operations-store";

export async function POST(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenantId") ?? "tenant_bella");
  const orderId = String(formData.get("orderId") ?? "");
  const orderStatus = String(formData.get("orderStatus") ?? "placed");

  await updateOrderStatus(tenantId, orderId, orderStatus as never);

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
