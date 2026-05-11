import { NextRequest } from "next/server";

import { requireCustomerOrderAccess } from "../../../../../../../../lib/authz";
import { serializeOrderTracking } from "../../../../../../../../lib/tracking-view";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireCustomerOrderAccess(
    request,
    (await context.params).id
  );

  if (response || !session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        const orderAccess = await requireCustomerOrderAccess(request, id);
        const order = orderAccess.order;

        if (!order) {
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
