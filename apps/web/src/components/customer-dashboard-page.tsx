"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Order } from "@rcc/contracts";

import { formatMoney } from "../lib/currency";
import { clearCustomerInfo, clearCustomerSession, readCustomerInfo } from "./customer-session";

type CustomerDashboardProps = {
  session: {
    id: string;
    email: string;
    name: string;
  };
  activeOrder: Order | null;
  recentOrders: Order[];
};

function getOrderProgress(order: Order) {
  if (order.fulfillmentType === "delivery" && order.deliveryTracking) {
    const stageFloor: Record<NonNullable<Order["deliveryTracking"]>["deliveryStatus"], number> = {
      awaiting_dispatch: 0.24,
      driver_assigned: 0.45,
      out_for_delivery: 0.72,
      arriving: 0.9,
      delivered: 1,
      delivery_failed: 1
    };
    const activeStage =
      order.deliveryTracking.deliveryStatus === "awaiting_dispatch"
        ? "Awaiting dispatch"
        : order.deliveryTracking.deliveryStatus === "driver_assigned"
          ? "Driver assigned"
          : order.deliveryTracking.deliveryStatus === "out_for_delivery"
            ? "Out for delivery"
            : order.deliveryTracking.deliveryStatus === "arriving"
              ? "Arriving soon"
              : order.deliveryTracking.deliveryStatus === "delivered"
                ? "Delivered"
                : "Delivery issue";
    const remainingMinutes = order.deliveryTracking.estimatedDeliveredAt
      ? Math.max(
          Math.round((new Date(order.deliveryTracking.estimatedDeliveredAt).getTime() - Date.now()) / 60000),
          0
        )
      : 0;

    return {
      progress: stageFloor[order.deliveryTracking.deliveryStatus],
      remainingMinutes,
      activeStage
    };
  }

  const elapsedMinutes = Math.max(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000,
    0
  );
  const totalMinutes = order.fulfillmentType === "delivery" ? 45 : 25;
  const elapsedProgress = Math.min(elapsedMinutes / totalMinutes, 1);
  const statusFloor: Record<Order["orderStatus"], number> = {
    pending_payment: 0.12,
    placed: 0.24,
    accepted: 0.36,
    preparing: 0.56,
    ready: 0.76,
    out_for_delivery: 0.88,
    completed: 1,
    cancelled: 1,
    refunded: 1
  };

  const progress = Math.max(statusFloor[order.orderStatus] ?? 0.12, elapsedProgress);
  const remainingMinutes = Math.max(Math.round(totalMinutes - elapsedMinutes), 0);
  const activeStage =
    order.orderStatus === "pending_payment"
      ? "Awaiting payment"
      : order.orderStatus === "placed"
        ? "Order placed"
        : order.orderStatus === "accepted"
          ? "Accepted"
          : order.orderStatus === "preparing"
            ? "Kitchen prep"
            : order.orderStatus === "ready"
              ? "Ready for collection"
              : order.orderStatus === "out_for_delivery"
                ? "Out for delivery"
                : order.orderStatus === "completed"
                  ? order.fulfillmentType === "delivery"
                    ? "Delivered"
                    : "Collected"
                  : order.orderStatus === "cancelled"
                    ? "Cancelled"
                    : "Refunded";

  return {
    progress,
    remainingMinutes,
    activeStage
  };
}

export function CustomerDashboardPage({
  session,
  activeOrder,
  recentOrders
}: CustomerDashboardProps) {
  const router = useRouter();
  const [info, setInfo] = useState<ReturnType<typeof readCustomerInfo>>(null);

  useEffect(() => {
    setInfo(readCustomerInfo());
  }, []);

  const orderProgress = activeOrder ? getOrderProgress(activeOrder) : null;

  return (
    <div className="stack-xl">
      <section className="customer-dashboard-top">
        <div className="panel tone-dark customer-dashboard-hero">
          <p className="eyebrow">Customer dashboard</p>
          <h2>{session.name ? `Welcome back, ${session.name}` : "Welcome back"}</h2>
          <p>
            Manage your ordering details, jump back into the menu, and keep your
            contact information ready for faster checkout.
          </p>
        </div>

        <div className="panel tone-warm customer-order-progress">
          <p className="eyebrow">Current order progress</p>
          {activeOrder && orderProgress ? (
            <>
              <h2>
                {activeOrder.fulfillmentType === "delivery"
                  ? `Arriving in ${orderProgress.remainingMinutes} min`
                  : `Ready in ${orderProgress.remainingMinutes} min`}
              </h2>
              <p>
                Order {activeOrder.orderNumber} is currently <strong>{orderProgress.activeStage}</strong>.
                This panel now follows the live order status and order age.
              </p>
              <div className="customer-order-progress-bar" aria-label="Current order progress">
                <span style={{ width: `${Math.max(orderProgress.progress * 100, 8)}%` }} />
              </div>
              <div className="customer-order-progress-meta">
                <strong>{Math.round(orderProgress.progress * 100)}%</strong>
                <span>{orderProgress.activeStage}</span>
              </div>
              <div className="customer-order-progress-steps">
                <span className={orderProgress.progress >= 0.12 ? "is-active" : ""}>Order placed</span>
                <span className={orderProgress.progress >= 0.48 ? "is-active" : ""}>Kitchen prep</span>
                <span className={orderProgress.progress >= 0.76 ? "is-active" : ""}>
                  {activeOrder.fulfillmentType === "delivery" ? "Out for delivery" : "Ready for pickup"}
                </span>
              </div>
            </>
          ) : (
            <>
              <h2>No active order right now</h2>
              <p>
                When you place a new order, this panel will switch to live progress based on the
                current order status.
              </p>
            </>
          )}
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <p className="eyebrow">Account details</p>
          <h2>Your information</h2>
          <div className="contact-list customer-dashboard-list">
            <div>
              <span>Name</span>
              <strong>{info?.name || session.name || "Guest customer"}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{info?.email || session.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{info?.phone || recentOrders[0]?.customerPhone || "Add during checkout"}</strong>
            </div>
            {recentOrders[0] ? (
              <div>
                <span>Most recent order</span>
                <strong>{recentOrders[0].orderNumber} {"\u00b7"} {formatMoney(recentOrders[0].total)}</strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel tone-warm">
          <p className="eyebrow">Quick actions</p>
          <h2>What would you like to do?</h2>
          <div className="stack customer-dashboard-actions">
            <Link href="/menu" className="button-primary">
              Start a new order
            </Link>
            <Link href="/account/track-orders" className="button-ghost">
              Track orders
            </Link>
            <Link href="/account/order-history" className="button-ghost">
              Order history
            </Link>
            <Link href="/cart" className="button-ghost">
              Review cart
            </Link>
            <button
              type="button"
              className="button-ghost"
              onClick={async () => {
                await fetch("/api/v1/customer/auth/logout", { method: "POST" });
                clearCustomerSession();
                clearCustomerInfo();
                router.replace("/");
                router.refresh();
              }}
            >
              Log out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

