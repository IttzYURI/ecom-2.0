"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import type { Driver, Order } from "@rcc/contracts";

import { formatMoney } from "../lib/currency";

type DriverConsoleProps = {
  driver: Driver;
  orders: Order[];
};

function DriverLocationControl({ orderId }: { orderId: string }) {
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sharing || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        await fetch(`/api/v1/driver/orders/${encodeURIComponent(orderId)}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy
          })
        });
        setMessage("Approximate location sharing is active.");
      },
      () => {
        setMessage("Location access was blocked or failed.");
        setSharing(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 15000,
        timeout: 20000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [orderId, sharing]);

  return (
    <div className="driver-location-control">
      <button
        type="button"
        className="button-ghost compact-button"
        onClick={() => setSharing((current) => !current)}
      >
        {sharing ? "Stop location sharing" : "Start location sharing"}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function DriverConsole({ driver, orders }: DriverConsoleProps) {
  const [isPending, startTransition] = useTransition();
  const [activeOrders, setActiveOrders] = useState(orders);

  useEffect(() => {
    setActiveOrders(orders);
  }, [orders]);

  useEffect(() => {
    const source = new EventSource("/api/v1/driver/session/stream");

    source.onmessage = (event) => {
      startTransition(() => {
        const payload = JSON.parse(event.data) as { orders: Order[] };
        setActiveOrders(payload.orders);
      });
    };

    return () => {
      source.close();
    };
  }, []);

  const assignedOrders = activeOrders.filter(
    (order) =>
      order.deliveryTracking?.assignedDriverId === driver.id &&
      !["delivered", "delivery_failed"].includes(order.deliveryTracking.deliveryStatus)
  );

  return (
    <section className="stack-xl">
      <section className="panel tone-dark">
        <p className="eyebrow">Driver workspace</p>
        <h2>{driver.name}</h2>
        <p>
          Vehicle: {driver.vehicleLabel}. Keep your assigned delivery milestones updated and share approximate location while active.
        </p>
        <div className="actions">
          <form action="/api/v1/driver/logout" method="post">
            <button type="submit" className="button-secondary">Log out</button>
          </form>
          <Link href="/account/track-orders" className="button-ghost">Customer view</Link>
        </div>
      </section>

      {assignedOrders.length ? (
        <div className="admin-panel-grid">
          {assignedOrders.map((order) => (
            <article key={order.id} className="panel driver-order-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Assigned delivery</p>
                  <h2>{order.orderNumber}</h2>
                  <p>
                    {order.customerName} | {formatMoney(order.total)} | {order.address}
                  </p>
                </div>
                {order.deliveryTracking ? (
                  <Link href={`/track/${order.deliveryTracking.trackingToken}`} className="button-ghost compact-button">
                    Customer tracking
                  </Link>
                ) : null}
              </div>

              <div className="driver-order-actions">
                {(["driver_assigned", "out_for_delivery", "arriving", "delivered"] as const).map((status) => (
                  <form
                    key={status}
                    action={`/api/v1/driver/orders/${order.id}/status`}
                    method="post"
                    className="inline-status-form"
                  >
                    <input type="hidden" name="deliveryStatus" value={status} />
                    <button type="submit" className="button-ghost compact-button" disabled={isPending}>
                      {status.replaceAll("_", " ")}
                    </button>
                  </form>
                ))}
              </div>

              <DriverLocationControl orderId={order.id} />
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <p className="eyebrow">No assignments</p>
          <h2>No active deliveries right now</h2>
          <p>This console will update when the restaurant assigns you a delivery.</p>
        </section>
      )}
    </section>
  );
}
