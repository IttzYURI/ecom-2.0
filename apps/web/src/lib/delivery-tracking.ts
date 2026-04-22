import type {
  DeliveryStatus,
  DeliveryTracking,
  DeliveryTrackingEvent,
  DeliveryTrackingEventType,
  DriverLocationSnapshot,
  Order
} from "@rcc/contracts";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isDeliveryOrder(order: Pick<Order, "fulfillmentType">) {
  return order.fulfillmentType === "delivery";
}

export function formatTrackingLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createTrackingToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function addMinutes(timestamp: string, minutes: number) {
  const value = new Date(timestamp);
  value.setMinutes(value.getMinutes() + minutes);
  return value.toISOString();
}

export function createTrackingEvent(
  type: DeliveryTrackingEventType,
  createdAt: string,
  description?: string
): DeliveryTrackingEvent {
  return {
    id: createId("tracking_event"),
    type,
    label: formatTrackingLabel(type),
    description,
    createdAt
  };
}

export function getDeliveryStatusFromOrderStatus(orderStatus: Order["orderStatus"]): DeliveryStatus {
  if (orderStatus === "completed") {
    return "delivered";
  }

  if (["cancelled", "refunded"].includes(orderStatus)) {
    return "delivery_failed";
  }

  return "awaiting_dispatch";
}

export function createInitialDeliveryTracking(order: Pick<Order, "createdAt" | "orderStatus">): DeliveryTracking {
  const estimatedReadyAt = addMinutes(order.createdAt, 20);
  const estimatedDeliveredAt = addMinutes(order.createdAt, 45);
  const deliveryStatus = getDeliveryStatusFromOrderStatus(order.orderStatus);
  const trackingEvents: DeliveryTrackingEvent[] = [
    createTrackingEvent("order_confirmed", order.createdAt, "The restaurant has received the delivery order.")
  ];

  if (order.orderStatus === "accepted" || order.orderStatus === "preparing") {
    trackingEvents.push(
      createTrackingEvent("preparing", addMinutes(order.createdAt, 6), "The kitchen has started preparing the order.")
    );
  }

  if (order.orderStatus === "completed") {
    trackingEvents.push(
      createTrackingEvent(
        "ready_for_dispatch",
        estimatedReadyAt,
        "The order is packed and ready to leave the restaurant."
      ),
      createTrackingEvent(
        "delivered",
        estimatedDeliveredAt,
        "The order has been marked as delivered."
      )
    );
  }

  if (deliveryStatus === "delivery_failed") {
    trackingEvents.push(
      createTrackingEvent(
        "delivery_failed",
        addMinutes(order.createdAt, 30),
        "The delivery could not be completed."
      )
    );
  }

  return {
    trackingToken: createTrackingToken(),
    deliveryStatus,
    estimatedReadyAt,
    estimatedDeliveredAt,
    deliveredAt: deliveryStatus === "delivered" ? estimatedDeliveredAt : undefined,
    trackingEvents,
    lastUpdatedAt: order.createdAt
  };
}

export function normalizeDeliveryTracking(order: Order): Order {
  if (!isDeliveryOrder(order)) {
    return {
      ...order,
      deliveryTracking: null
    };
  }

  if (order.deliveryTracking) {
    return order;
  }

  return {
    ...order,
    deliveryTracking: createInitialDeliveryTracking(order)
  };
}

export function appendTrackingEvent(
  tracking: DeliveryTracking,
  type: DeliveryTrackingEventType,
  createdAt: string,
  description?: string
) {
  return {
    ...tracking,
    trackingEvents: [...tracking.trackingEvents, createTrackingEvent(type, createdAt, description)],
    lastUpdatedAt: createdAt
  };
}

export function applyDeliveryStatusUpdate(
  tracking: DeliveryTracking,
  status: DeliveryStatus,
  now: string,
  options?: {
    estimatedDeliveredAt?: string;
    description?: string;
    lastKnownLocation?: DriverLocationSnapshot;
  }
): DeliveryTracking {
  let nextTracking: DeliveryTracking = {
    ...tracking,
    deliveryStatus: status,
    estimatedDeliveredAt: options?.estimatedDeliveredAt ?? tracking.estimatedDeliveredAt,
    lastKnownLocation: options?.lastKnownLocation ?? tracking.lastKnownLocation,
    lastUpdatedAt: now
  };

  if (status === "out_for_delivery" && !nextTracking.dispatchedAt) {
    nextTracking = {
      ...nextTracking,
      dispatchedAt: now,
      pickedUpAt: now
    };
  }

  if (status === "delivered") {
    nextTracking = {
      ...nextTracking,
      deliveredAt: now
    };
  }

  const eventType: Record<DeliveryStatus, DeliveryTrackingEventType> = {
    awaiting_dispatch: "ready_for_dispatch",
    driver_assigned: "driver_assigned",
    out_for_delivery: "out_for_delivery",
    arriving: "arriving",
    delivered: "delivered",
    delivery_failed: "delivery_failed"
  };

  return appendTrackingEvent(nextTracking, eventType[status], now, options?.description);
}

export function sanitizeApproximateLocation(location: DriverLocationSnapshot): DriverLocationSnapshot {
  const rounded = (value: number) => Math.round(value * 1000) / 1000;

  return {
    lat: rounded(location.lat),
    lng: rounded(location.lng),
    capturedAt: location.capturedAt,
    accuracyMeters: Math.max(20, Math.round(location.accuracyMeters))
  };
}
