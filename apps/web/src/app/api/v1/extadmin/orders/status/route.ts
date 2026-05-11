import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermission } from "../../../../../../lib/authz";
import { updateOrderStatus } from "../../../../../../lib/operations-store";
import { ensureAutoPrintJobForOrder } from "../../../../../../lib/printing-service";

export async function POST(request: NextRequest) {
  const { session, response } = await requireExtAdminPermission(
    request,
    "tenant.orders.manage"
  );
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const tenantId = session.tenantId;
  const orderId = String(formData.get("orderId") ?? "");
  const orderStatus = String(formData.get("orderStatus") ?? "placed");

  await updateOrderStatus(tenantId, orderId, orderStatus as never);
  await ensureAutoPrintJobForOrder(tenantId, orderId);

  return NextResponse.redirect(new URL("/extadmin/orders", request.url));
}
