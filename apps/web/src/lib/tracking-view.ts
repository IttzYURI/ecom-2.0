import type { DeliveryTracking, Order } from "@rcc/contracts";

import { formatTrackingLabel } from "./delivery-tracking";
import { getApproximateDestinationCoordinate, getRestaurantCoordinate } from "./routing";

export type SerializedOrderTracking = ReturnType<typeof serializeOrderTracking>;

function formatEtaWindow(estimatedDeliveredAt: string | undefined) {
  if (!estimatedDeliveredAt) {
    return null;
  }

  const end = new Date(estimatedDeliveredAt);
  const start = new Date(end.getTime() - 10 * 60000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`
  };
}

function getCurrentStageText(tracking: DeliveryTracking) {
  const labels: Record<DeliveryTracking["deliveryStatus"], string> = {
    awaiting_dispatch: "Awaiting dispatch",
    driver_assigned: "Driver assigned",
    out_for_delivery: "Out for delivery",
    arriving: "Arriving soon",
    delivered: "Delivered",
    delivery_failed: "Delivery issue"
  };

  return labels[tracking.deliveryStatus];
}

export function serializeOrderTracking(order: Order) {
  const tracking = order.deliveryTracking;
  const etaWindow = tracking ? formatEtaWindow(tracking.estimatedDeliveredAt) : null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    fulfillmentType: order.fulfillmentType,
    orderStatus: formatTrackingLabel(order.orderStatus),
    paymentStatus: formatTrackingLabel(order.paymentStatus),
    address: order.address ?? "",
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    items: order.items,
    tracking: tracking
      ? {
          token: tracking.trackingToken,
          status: tracking.deliveryStatus,
          stageLabel: getCurrentStageText(tracking),
          estimatedReadyAt: tracking.estimatedReadyAt ?? null,
          estimatedDeliveredAt: tracking.estimatedDeliveredAt ?? null,
          etaWindow,
          assignedDriverId: tracking.assignedDriverId ?? null,
          assignedDriverName: tracking.assignedDriverName ?? null,
          dispatchedAt: tracking.dispatchedAt ?? null,
          pickedUpAt: tracking.pickedUpAt ?? null,
          deliveredAt: tracking.deliveredAt ?? null,
          lastKnownLocation:
            tracking.deliveryStatus === "delivered" || tracking.deliveryStatus === "delivery_failed"
              ? null
              : tracking.lastKnownLocation ?? null,
          restaurantLocation: getRestaurantCoordinate(order.tenantId),
          destinationLocation: getApproximateDestinationCoordinate(order),
          trackingEvents: tracking.trackingEvents
            .slice()
            .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        }
      : null
  };
}
