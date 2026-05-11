import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryTrackingView } from "../../../components/delivery-tracking-view";
import { LayoutShell } from "../../../components/layout-shell";
import { formatMoney } from "../../../lib/currency";
import { getCustomerSessionFromCookieStore } from "../../../lib/customer-auth";
import { getStoredCustomerOrders } from "../../../lib/operations-store";
import { serializeOrderTracking } from "../../../lib/tracking-view";

export default async function AccountTrackOrdersRoute() {
  const session = await getCustomerSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  const orders = await getStoredCustomerOrders(session.tenantId, session.email);
  const activeDeliveryOrders = orders.filter(
    (order) =>
      order.fulfillmentType === "delivery" &&
      order.deliveryTracking &&
      !["delivered", "delivery_failed"].includes(order.deliveryTracking.deliveryStatus)
  );
  const activeCollectionOrders = orders.filter(
    (order) =>
      order.fulfillmentType !== "delivery" &&
      ["pending_payment", "placed", "accepted", "preparing"].includes(order.orderStatus)
  );

  return (
    <LayoutShell
      eyebrow="Customer account"
      title="Track orders"
      subtitle="Follow your active deliveries with ETA, driver assignment, and milestone updates."
    >
      <section className="stack-xl">
        {activeDeliveryOrders.length ? (
          <DeliveryTrackingView
            initialOrders={activeDeliveryOrders.map((order) => serializeOrderTracking(order))}
            mode="customer"
          />
        ) : (
          <section className="panel">
            <p className="eyebrow">No live deliveries</p>
            <h2>Nothing is currently out for delivery</h2>
            <p>You can start a new order from the menu, or review your previous purchases in order history.</p>
            <div className="actions">
              <Link href="/menu" className="button-primary">Start a new order</Link>
              <Link href="/account/order-history" className="button-secondary">Order history</Link>
            </div>
          </section>
        )}

        {activeCollectionOrders.length ? (
          <section className="panel">
            <p className="eyebrow">Collection orders</p>
            <h2>Pickup orders still in progress</h2>
            <div className="card-grid">
              {activeCollectionOrders.map((order) => (
                <article key={order.id} className="panel tone-warm">
                  <p className="eyebrow">Live order</p>
                  <h2>{order.orderNumber}</h2>
                  <div className="contact-list customer-dashboard-list">
                    <div><span>Status</span><strong>{order.orderStatus.replaceAll("_", " ")}</strong></div>
                    <div><span>Fulfilment</span><strong>{order.fulfillmentType}</strong></div>
                    <div><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
                    <div><span>Placed</span><strong>{new Date(order.createdAt).toLocaleString()}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </LayoutShell>
  );
}
