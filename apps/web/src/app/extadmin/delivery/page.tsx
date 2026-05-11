import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminDeliveryPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundleWithOperations(session.tenantId);
  const deliveryOrders = bundle.orders.filter((order) => order.fulfillmentType === "delivery");
  const collectionOrders = bundle.orders.filter((order) => order.fulfillmentType === "collection");

  return (
    <ExtAdminShell title="Delivery & Collection" subtitle="Monitor delivery zones, driver assignments, and collection readiness.">
      <section className="admin-page-stack">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Coverage</p>
              <h3>Delivery postcodes</h3>
              <p>Postcodes currently served for delivery orders.</p>
            </div>
          </div>
          <ul className="plain-list admin-coverage-list">
            {bundle.tenant.deliveryPostcodes.map((postcode) => (
              <li key={postcode}>
                <strong>{postcode}</strong>
                <span>Delivery enabled</span>
              </li>
            ))}
            {!bundle.tenant.deliveryPostcodes.length ? (
              <li><span>No delivery postcodes configured. Add them from Settings.</span></li>
            ) : null}
          </ul>
        </article>

        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Fleet</p>
              <h3>Active drivers</h3>
              <p>Drivers available for delivery assignment.</p>
            </div>
          </div>
          <div className="admin-panel-grid">
            {bundle.drivers.map((driver) => (
              <section key={driver.id} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Driver</p>
                    <h3>{driver.name}</h3>
                    <p>{driver.phone}</p>
                  </div>
                  <span className={`admin-badge ${driver.active ? "success" : "danger"}`}>
                    {driver.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p>{driver.vehicleLabel}</p>
              </section>
            ))}
            {!bundle.drivers.length ? (
              <div className="admin-empty-card">No drivers configured.</div>
            ) : null}
          </div>
        </article>

        <article className="admin-surface-card admin-table-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Summary</p>
              <h3>Order breakdown</h3>
              <p>Delivery vs. collection split across all orders.</p>
            </div>
          </div>
          <div className="admin-breakdown-list">
            <div className="admin-breakdown-row">
              <strong>Delivery orders</strong>
              <span>{deliveryOrders.length}</span>
            </div>
            <div className="admin-breakdown-row">
              <strong>Collection orders</strong>
              <span>{collectionOrders.length}</span>
            </div>
            <div className="admin-breakdown-row">
              <strong>Delivery postcodes</strong>
              <span>{bundle.tenant.deliveryPostcodes.length}</span>
            </div>
            <div className="admin-breakdown-row">
              <strong>Active drivers</strong>
              <span>{bundle.drivers.filter((d) => d.active).length}</span>
            </div>
          </div>
        </article>
      </section>
    </ExtAdminShell>
  );
}
