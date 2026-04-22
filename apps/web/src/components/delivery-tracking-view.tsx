"use client";

import { useEffect, useMemo, useState } from "react";

import { formatMoney } from "../lib/currency";
import type { SerializedOrderTracking } from "../lib/tracking-view";
import { TrackingLiveMap } from "./tracking-live-map";

type DeliveryTrackingViewProps = {
  initialOrders: SerializedOrderTracking[];
  mode: "customer" | "public";
};

function TrackingCard({ order }: { order: SerializedOrderTracking }) {
  const tracking = order.tracking;

  if (!tracking) {
    return null;
  }

  return (
    <article className="panel tracking-card">
      <div className="tracking-card-top">
        <div>
          <p className="eyebrow">Delivery tracking</p>
          <h2>{order.orderNumber}</h2>
          <p>{tracking.stageLabel}</p>
        </div>
        <div className="tracking-status-pill">{tracking.stageLabel}</div>
      </div>

      <div className="tracking-summary-grid">
        <div>
          <span>ETA window</span>
          <strong>{tracking.etaWindow?.label ?? "Updating soon"}</strong>
        </div>
        <div>
          <span>Payment</span>
          <strong>{order.paymentStatus}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatMoney(order.total)}</strong>
        </div>
        <div>
          <span>Address</span>
          <strong>{order.address || "Delivery address unavailable"}</strong>
        </div>
      </div>

      {tracking.assignedDriverName ? (
        <div className="tracking-driver-card">
          <p className="eyebrow">Driver</p>
          <h3>{tracking.assignedDriverName}</h3>
          <p>
            {tracking.lastKnownLocation
              ? `Approximate location updated ${new Date(tracking.lastKnownLocation.capturedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}.`
              : "Driver assignment confirmed. Live location is only shown during active delivery updates."}
          </p>
        </div>
      ) : null}

      {tracking.lastKnownLocation ? (
        <div className="tracking-map-placeholder">
          <p className="eyebrow">Approximate location</p>
          <strong>
            {tracking.lastKnownLocation.lat.toFixed(3)}, {tracking.lastKnownLocation.lng.toFixed(3)}
          </strong>
          <span>
            Accuracy about {tracking.lastKnownLocation.accuracyMeters}m.
          </span>
          <TrackingLiveMap
            driverLocation={tracking.lastKnownLocation}
            destinationLocation={tracking.destinationLocation}
            restaurantLocation={tracking.restaurantLocation}
          />
        </div>
      ) : null}

      <div className="tracking-details-grid">
        <section>
          <p className="eyebrow">Timeline</p>
          <div className="tracking-timeline">
            {tracking.trackingEvents.map((event) => (
              <article key={event.id} className="tracking-timeline-item">
                <strong>{event.label}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
                {event.description ? <p>{event.description}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow">Order summary</p>
          <div className="tracking-line-list">
            {order.items.map((item) => (
              <div key={`${order.orderId}-${item.menuItemId}`}>
                <span>
                  {item.quantity}x {item.name}
                </span>
                <strong>{formatMoney(item.quantity * item.unitPrice)}</strong>
              </div>
            ))}
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(order.subtotal)}</strong>
            </div>
            <div>
              <span>Delivery fee</span>
              <strong>{formatMoney(order.deliveryFee)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{formatMoney(order.discount)}</strong>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export function DeliveryTrackingView({ initialOrders, mode }: DeliveryTrackingViewProps) {
  const [orders, setOrders] = useState(initialOrders);
  const streamTargets = useMemo(
    () =>
      orders.map((order) => ({
        orderId: order.orderId,
        url:
          mode === "public" && order.tracking?.token
            ? `/api/v1/public/orders/track/stream?token=${encodeURIComponent(order.tracking.token)}`
            : `/api/v1/customer/orders/${encodeURIComponent(order.orderId)}/tracking/stream`
      })),
    [mode, orders]
  );

  useEffect(() => {
    const sources = streamTargets.map((target) => {
      const source = new EventSource(target.url);

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as SerializedOrderTracking;
        setOrders((currentOrders) =>
          currentOrders.map((entry) => (entry.orderId === payload.orderId ? payload : entry))
        );
      };

      return source;
    });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [streamTargets]);

  return (
    <div className="stack-xl">
      {orders.map((order) => (
        <TrackingCard key={order.orderId} order={order} />
      ))}
    </div>
  );
}
