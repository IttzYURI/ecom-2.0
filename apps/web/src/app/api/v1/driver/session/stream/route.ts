import { NextRequest } from "next/server";

import { filterOrdersForDriver, requireDriverActor } from "../../../../../../lib/authz";
import { getStoredOperationsContent } from "../../../../../../lib/operations-store";

export async function GET(request: NextRequest) {
  const { session, driver, response } = await requireDriverActor(request);

  if (response) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        const operations = await getStoredOperationsContent(session.tenantId);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              driver,
              orders: filterOrdersForDriver(operations.orders, session.driverId)
            })}\n\n`
          )
        );
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
