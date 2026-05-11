import { NextRequest } from "next/server";

import { getStoredOrderByTrackingToken } from "../../../../../../../lib/operations-store";
import { resolvePublicTenantFromRequest } from "../../../../../../../lib/tenant-resolver";
import { serializeOrderTracking } from "../../../../../../../lib/tracking-view";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;

  if (!token) {
    return new Response("Tracking token required", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        const order = await getStoredOrderByTrackingToken(tenantId, token);

        if (!order?.deliveryTracking) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "Tracking unavailable" })}\n\n`));
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(serializeOrderTracking(order))}\n\n`));
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
