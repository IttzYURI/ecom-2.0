import { redirect } from "next/navigation";

import { formatMoney } from "../../../lib/currency";
import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminReportsPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundleWithOperations(session.tenantId);

  const totalRevenue = bundle.orders.reduce((sum, o) => sum + o.total, 0);
  const paidRevenue = bundle.orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.total, 0);
  const deliveryCount = bundle.orders.filter((o) => o.fulfillmentType === "delivery").length;
  const collectionCount = bundle.orders.filter((o) => o.fulfillmentType === "collection").length;
  const avgOrder = bundle.orders.length ? totalRevenue / bundle.orders.length : 0;
  const topItems = bundle.menuItems
    .filter((item) => item.available)
    .sort((a, b) => b.basePrice - a.basePrice)
    .slice(0, 5);

  return (
    <ExtAdminShell title="Reports" subtitle="Operational summaries and business insights from current order data.">
      <section className="admin-page-stack">
        <section className="admin-metric-grid">
          <article className="admin-metric-card tone-forest">
            <div className="admin-metric-copy">
              <p>Revenue</p>
              <h3>{formatMoney(paidRevenue)}</h3>
              <span>{formatMoney(totalRevenue)} total incl. pending</span>
            </div>
          </article>
          <article className="admin-metric-card tone-orange">
            <div className="admin-metric-copy">
              <p>Orders</p>
              <h3>{bundle.orders.length}</h3>
              <span>Avg. {formatMoney(avgOrder)} per order</span>
            </div>
          </article>
          <article className="admin-metric-card tone-gold">
            <div className="admin-metric-copy">
              <p>Fulfilment mix</p>
              <h3>{deliveryCount}D / {collectionCount}C</h3>
              <span>Delivery vs. collection</span>
            </div>
          </article>
        </section>

        <div className="admin-visual-grid">
          <article className="admin-surface-card">
            <div className="admin-card-topline">
              <div>
                <p className="eyebrow">Breakdown</p>
                <h3>Order status summary</h3>
              </div>
            </div>
            <div className="admin-breakdown-list">
              {["placed", "accepted", "preparing", "completed", "cancelled"].map((status) => {
                const count = bundle.orders.filter((o) => o.orderStatus === status).length;
                return (
                  <div key={status} className="admin-breakdown-row">
                    <strong>{status.replace("_", " ")}</strong>
                    <span>{count} orders</span>
                  </div>
                );
              })}
              <div className="admin-breakdown-row">
                <strong>Payment pending</strong>
                <span>{bundle.orders.filter((o) => o.paymentStatus === "pending").length}</span>
              </div>
              <div className="admin-breakdown-row">
                <strong>Paid</strong>
                <span>{bundle.orders.filter((o) => o.paymentStatus === "paid").length}</span>
              </div>
            </div>
          </article>

          <article className="admin-surface-card">
            <div className="admin-card-topline">
              <div>
                <p className="eyebrow">Catalog</p>
                <h3>Top priced items</h3>
              </div>
            </div>
            <div className="admin-breakdown-list">
              {topItems.map((item) => (
                <div key={item.id} className="admin-breakdown-row">
                  <strong>{item.name}</strong>
                  <span>{formatMoney(item.basePrice)}</span>
                </div>
              ))}
              {!topItems.length ? <div className="admin-empty-card">No menu items.</div> : null}
            </div>
          </article>
        </div>
      </section>
    </ExtAdminShell>
  );
}
