import { formatMoney } from "../lib/currency";

import type { PlatformMetric, TenantBundle } from "@rcc/contracts";

export function TenantAdminDashboard({ bundle }: { bundle: TenantBundle }) {
  const pendingOrders = bundle.orders.filter((order) =>
    ["pending_payment", "placed", "accepted"].includes(order.orderStatus)
  );

  return (
    <section className="stack">
      <div className="stat-grid">
        <article className="panel">
          <p className="eyebrow">Orders today</p>
          <h2>{bundle.orders.length}</h2>
        </article>
        <article className="panel">
          <p className="eyebrow">Pending bookings</p>
          <h2>{bundle.bookings.filter((booking) => booking.status === "pending").length}</h2>
        </article>
        <article className="panel">
          <p className="eyebrow">Live menu items</p>
          <h2>{bundle.menuItems.filter((item) => item.available).length}</h2>
        </article>
      </div>

      <article className="panel">
        <h2>Orders queue</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.customerName}</td>
                <td>{order.orderStatus}</td>
                <td>{formatMoney(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

export function TenantCatalogPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Categories</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Visible</th>
            </tr>
          </thead>
          <tbody>
            {bundle.categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>{category.visible ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
      <article className="panel">
        <h2>Menu items</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Base price</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {bundle.menuItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{formatMoney(item.basePrice)}</td>
                <td>{item.available ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

export function TenantOperationsPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="content-grid">
      <article className="panel">
        <h2>Bookings</h2>
        <ul className="plain-list">
          {bundle.bookings.map((booking) => (
            <li key={booking.id}>
              <strong>
                {booking.customerName} · {booking.partySize} guests
              </strong>
              <span>
                {booking.bookingDate} at {booking.bookingTime} · {booking.status}
              </span>
            </li>
          ))}
        </ul>
      </article>
      <article className="panel">
        <h2>Staff roles</h2>
        <ul className="plain-list">
          {bundle.staff.map((member) => (
            <li key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function PlatformDashboard({
  metrics,
  tenants
}: {
  metrics: PlatformMetric[];
  tenants: TenantBundle["tenant"][];
}) {
  return (
    <section className="stack">
      <div className="stat-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="panel">
            <p className="eyebrow">{metric.label}</p>
            <h2>{metric.value}</h2>
          </article>
        ))}
      </div>

      <article className="panel">
        <h2>Tenant management</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Status</th>
              <th>Cuisine</th>
              <th>Domain handle</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>{tenant.status}</td>
                <td>{tenant.cuisine}</td>
                <td>{tenant.subdomain}.platform.test</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
