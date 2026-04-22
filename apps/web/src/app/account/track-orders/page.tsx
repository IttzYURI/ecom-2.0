import Link from "next/link";
import { redirect } from "next/navigation";

import { LayoutShell } from "../../../components/layout-shell";
import { formatMoney } from "../../../lib/currency";
import { getCustomerSessionFromCookieStore } from "../../../lib/customer-auth";
import { getDefaultTenant } from "../../../lib/mock-data";
import { getStoredCustomerOrders } from "../../../lib/operations-store";

export default async function AccountTrackOrdersRoute() {
  const session = await getCustomerSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  const tenantId = getDefaultTenant().id;
  const orders = await getStoredCustomerOrders(tenantId, session.email);
  const activeOrders = orders.filter((order) =>
    ["pending_payment", "placed", "accepted", "preparing"].includes(order.orderStatus)
  );

  return (
    <LayoutShell
      eyebrow="Customer account"
      title="Track orders"
      subtitle="Follow your live orders and keep an eye on fulfilment without calling the restaurant."
    >
      <section className="stack-xl">
        {activeOrders.length ? (
          <div className="card-grid">
            {activeOrders.map((order) => (
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
        ) : (
          <section className="panel">
            <p className="eyebrow">No live orders</p>
            <h2>Nothing is currently in progress</h2>
            <p>You can start a new order from the menu, or review your previous purchases in order history.</p>
            <div className="actions">
              <Link href="/menu" className="button-primary">Start a new order</Link>
              <Link href="/account/order-history" className="button-secondary">Order history</Link>
            </div>
          </section>
        )}
      </section>
    </LayoutShell>
  );
}
