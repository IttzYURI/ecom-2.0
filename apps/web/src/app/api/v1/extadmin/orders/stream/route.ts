import { NextRequest } from "next/server";

import { requireExtAdminSession } from "../../../../../../lib/extadmin-auth";
import { getDefaultTenant } from "../../../../../../lib/mock-data";
import { getRuntimeTenantBundleWithOperations } from "../../../../../../lib/operations-store";

export async function GET(request: NextRequest) {
  const unauthorized = await requireExtAdminSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim() || getDefaultTenant().id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        const bundle = await getRuntimeTenantBundleWithOperations(tenantId);
        const snapshot = bundle.orders
          .filter((order) => order.fulfillmentType === "delivery")
          .map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            deliveryStatus: order.deliveryTracking?.deliveryStatus ?? null,
            assignedDriverId: order.deliveryTracking?.assignedDriverId ?? null,
            estimatedDeliveredAt: order.deliveryTracking?.estimatedDeliveredAt ?? null
          }));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
      };

      await send();
      const intervalId = setInterval(send, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
