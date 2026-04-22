import { NextRequest } from "next/server";

import { getDriverSession } from "../../../../../../lib/driver-auth";
import { getStoredDrivers } from "../../../../../../lib/driver-store";
import { getStoredOperationsContent } from "../../../../../../lib/operations-store";

export async function GET(request: NextRequest) {
  const session = await getDriverSession(request);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        const driver = (await getStoredDrivers(session.tenantId)).find((entry) => entry.id === session.driverId);
        const operations = await getStoredOperationsContent(session.tenantId);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              driver,
              orders: operations.orders
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
