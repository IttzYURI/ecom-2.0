"use client";

import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { formatMoney } from "../lib/currency";
import type { AuditEntry } from "../lib/audit-store";
import type { NotificationEntry } from "../lib/notifications-store";

import type { TenantBundle } from "@rcc/contracts";

type AdminOrder = TenantBundle["orders"][number];

type NavItem = {
  href: Route;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/extadmin",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  },
  {
    href: "/extadmin/orders",
    label: "Orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    )
  },
  {
    href: "/extadmin/menu",
    label: "Menu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h10" />
      </svg>
    )
  },
  {
    href: "/extadmin/categories",
    label: "Categories",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      </svg>
    )
  },
  {
    href: "/extadmin/content",
    label: "Website Content",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="M21 15l-4.5-4.5L7 20" />
      </svg>
    )
  },
  {
    href: "/extadmin/media",
    label: "Media / Gallery",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    )
  },
  {
    href: "/extadmin/bookings",
    label: "Bookings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
      </svg>
    )
  },
  {
    href: "/extadmin/reviews",
    label: "Reviews",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    )
  },
  {
    href: "/extadmin/delivery",
    label: "Delivery & Collection",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="m16 8 4 2v6h-4" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  },
  {
    href: "/extadmin/opening-hours",
    label: "Opening Hours",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    )
  },
  {
    href: "/extadmin/payments",
    label: "Payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    )
  },
  {
    href: "/extadmin/printers",
    label: "Printer Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    )
  },
  {
    href: "/extadmin/staff",
    label: "Staff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M17 20a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4" />
        <circle cx="10" cy="8" r="4" />
        <path d="M20 8v6" />
        <path d="M17 11h6" />
      </svg>
    )
  },
  {
    href: "/extadmin/reports",
    label: "Reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    )
  },
  {
    href: "/extadmin/audit",
    label: "Audit Logs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    )
  }
];

function isActivePath(currentPath: string | null, href: string) {
  if (!currentPath) {
    return href === "/extadmin";
  }

  if (href === "/extadmin") {
    return currentPath === href;
  }

  return currentPath.startsWith(href);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrderTone(status: string) {
  if (["completed", "accepted"].includes(status)) {
    return "success";
  }

  if (["cancelled", "refunded", "rejected"].includes(status)) {
    return "danger";
  }

  return "warning";
}

function getPrintTone(order: AdminOrder) {
  if (order.printState?.lastPrintStatus === "printed") {
    return "success";
  }

  if (order.printState?.lastPrintStatus === "failed") {
    return "danger";
  }

  if (order.orderStatus === "pending_payment") {
    return "warning";
  }

  return "warning";
}

function getPrintLabel(order: AdminOrder) {
  if (order.printState?.lastPrintStatus === "printed") {
    return `Printed x${order.printState.printCount}`;
  }

  if (order.printState?.lastPrintStatus === "failed") {
    return "Print failed";
  }

  if (order.orderStatus === "pending_payment") {
    return "Awaiting payment";
  }

  return order.printState?.hasKitchenPrint ? "Printed" : "Pending print";
}

function AdminShellTopMeta() {
  return (
    <div className="admin-utility-cluster">
      <button type="button" className="admin-icon-button" aria-label="Notifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      </button>
      <button type="button" className="admin-icon-button" aria-label="Messages">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <div className="admin-profile-chip">
        <div className="admin-profile-copy">
          <strong>Owner</strong>
          <span>Admin portal</span>
        </div>
        <div className="admin-profile-avatar">RP</div>
      </div>
    </div>
  );
}

function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-section-actions">{actions}</div> : null}
    </div>
  );
}

function AdminStatCard({
  label,
  value,
  delta,
  tone,
  icon
}: {
  label: string;
  value: string;
  delta: string;
  tone: "orange" | "gold" | "forest";
  icon: ReactNode;
}) {
  return (
    <article className={`admin-metric-card tone-${tone}`}>
      <div className="admin-metric-icon">{icon}</div>
      <div className="admin-metric-copy">
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{delta}</span>
      </div>
    </article>
  );
}

function AdminChartCard({
  title,
  label,
  bars
}: {
  title: string;
  label: string;
  bars: Array<{ label: string; value: number; accent?: boolean }>;
}) {
  return (
    <article className="admin-surface-card admin-chart-card">
      <div className="admin-card-topline">
        <div>
          <h3>{title}</h3>
          <p>{label}</p>
        </div>
        <span>Live snapshot</span>
      </div>
      <div className="admin-chart-bars" aria-hidden="true">
        {bars.map((bar) => (
          <div key={bar.label} className={`admin-chart-bar ${bar.accent ? "accent" : ""}`}>
            <span style={{ height: `${Math.max(bar.value, 12)}%` }} />
            <small>{bar.label}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function AdminSummaryList({
  title,
  subtitle,
  items
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <article className="admin-surface-card">
      <div className="admin-card-topline">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="admin-breakdown-list">
        {items.map((item) => (
          <div key={item.label} className="admin-breakdown-row">
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-table-empty">
        {label}
      </td>
    </tr>
  );
}

export function ExtAdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 10h16" />
              <path d="M6 6h12" />
              <path d="M7 14h10" />
              <path d="M9 18h6" />
            </svg>
          </div>
          <div>
            <strong>Reztro</strong>
            <span>Owner portal</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Owner portal sections">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-sidebar-link ${active ? "active" : ""}`}
              >
                <span className="admin-sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-upgrade-card">
            <p>Service cadence</p>
            <strong>Lunch prep ready</strong>
            <span>Use the dashboard to monitor orders, bookings, and menu availability.</span>
          </div>
          <form action="/api/v1/extadmin/logout" method="post">
            <button type="submit" className="button-ghost compact-button block-button admin-logout-button">
              Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-stage">
        <header className="admin-topbar">
          <div className="admin-topbar-copy">
            <p className="eyebrow">Protected workspace</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="admin-topbar-tools">
            <label className="admin-search-shell" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input placeholder="Search anything" />
            </label>
            <AdminShellTopMeta />
          </div>
        </header>

        <div className="admin-stage-body">
          <div className="admin-page-frame">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ExtAdminLoginCard({
  error,
  tenantName,
  defaultEmail,
  platformTenantId
}: {
  error?: string | null;
  tenantName?: string | null;
  defaultEmail?: string | null;
  platformTenantId?: string | null;
}) {
  return (
    <main className="page-shell admin-login-shell">
      <section className="admin-login-card">
        <div className="admin-login-hero">
          <p className="eyebrow">Secure owner access</p>
          <h1>
            Run {tenantName ?? "your restaurant"} from one polished control room.
          </h1>
          <p>
            Update content, menu visibility, booking flow, and team access without exposing any
            admin controls to guests.
          </p>
          <div className="admin-login-points">
            <div>
              <strong>Service ready</strong>
              <span>Orders, bookings, media, and content in one protected workspace.</span>
            </div>
            <div>
              <strong>Reference-led design</strong>
              <span>Lightweight dashboard layout tuned for restaurant operations.</span>
            </div>
          </div>
        </div>

        <section className="admin-login-form">
          <div>
            <p className="eyebrow">Owner sign in</p>
            <h2>Welcome back</h2>
            <p>
              {platformTenantId
                ? `Opened from Super Admin for ${tenantName ?? "this restaurant"}. Owner credentials are still required.`
                : "Use the seeded owner account to access the restaurant workspace."}
            </p>
          </div>
          <form className="form-grid" method="post" action="/api/v1/extadmin/login">
            {platformTenantId ? (
              <input type="hidden" name="platformTenant" value={platformTenantId} />
            ) : null}
            <input
              name="email"
              type="email"
              placeholder="owner@bellaroma.test"
              defaultValue={defaultEmail ?? "owner@bellaroma.test"}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              defaultValue="demo1234"
            />
            <button type="submit" className="button-primary admin-submit-button">
              Login to owner portal
            </button>
            {error ? <p className="form-error">{error}</p> : null}
          </form>
        </section>
      </section>
    </main>
  );
}

export function ExtAdminDashboard({
  bundle,
  notifications
}: {
  bundle: TenantBundle;
  notifications: NotificationEntry[];
}) {
  const totalRevenue = bundle.orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalCustomers = new Set(
    bundle.orders.map((order) => order.customerEmail || order.customerName || order.id)
  ).size;
  const averageOrder = bundle.orders.length ? totalRevenue / bundle.orders.length : 0;
  const pendingOrders = bundle.orders.filter((order) =>
    ["pending_payment", "placed", "accepted", "preparing"].includes(order.orderStatus)
  );
  const topCategories = bundle.categories.slice(0, 4).map((category, index) => ({
    label: category.name,
    value: `${[34, 27, 21, 18][index] ?? 12}%`
  }));
  const orderTypes = [
    {
      label: "Collection",
      value: String(bundle.orders.filter((order) => order.fulfillmentType === "collection").length)
    },
    {
      label: "Delivery",
      value: String(bundle.orders.filter((order) => order.fulfillmentType === "delivery").length)
    }
  ].filter((item) => item.value !== "0");

  const recentOrders = bundle.orders.slice(0, 5);
  const trendingItems = bundle.menuItems.slice(0, 3);

  return (
    <div className="admin-page-layout">
      <main className="admin-page-main">
        <section className="admin-metric-grid">
          <AdminStatCard
            label="Total orders"
            value={formatCompactNumber(bundle.orders.length)}
            delta="Active service"
            tone="orange"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <path d="M14 2v5h5" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
            }
          />
          <AdminStatCard
            label="Guests reached"
            value={formatCompactNumber(totalCustomers)}
            delta="Unique customers"
            tone="gold"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M16 21a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4" />
                <circle cx="9.5" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M16 11h6" />
              </svg>
            }
          />
          <AdminStatCard
            label="Total revenue"
            value={formatMoney(totalRevenue)}
            delta={`Avg. ${formatMoney(averageOrder)}`}
            tone="forest"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 2v20" />
                <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
              </svg>
            }
          />
        </section>

        <section className="admin-visual-grid">
          <AdminChartCard
            title="Revenue flow"
            label={`Projected from ${bundle.orders.length} orders`}
            bars={[
              { label: "Mon", value: 32 },
              { label: "Tue", value: 48 },
              { label: "Wed", value: 41 },
              { label: "Thu", value: 74, accent: true },
              { label: "Fri", value: 58 },
              { label: "Sat", value: 86, accent: true }
            ]}
          />
          <div className="admin-summary-stack">
            <AdminSummaryList
              title="Top categories"
              subtitle="Best visibility this month"
              items={topCategories.length ? topCategories : [{ label: "No categories", value: "Pending" }]}
            />
            <AdminSummaryList
              title="Order types"
              subtitle="Current mix"
              items={orderTypes.length ? orderTypes : [{ label: "No orders", value: "0" }]}
            />
          </div>
        </section>

        <section className="admin-surface-card admin-table-card">
          <AdminSectionHeader
            eyebrow="Order flow"
            title="Recent orders"
            description="A quick read on the latest guest demand and fulfilment status."
            actions={<Link href="/extadmin/orders">See all orders</Link>}
          />
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Order">
                      <strong>{order.orderNumber || order.id.slice(0, 8)}</strong>
                    </td>
                    <td data-label="Type">{toTitleCase(order.fulfillmentType || "online")}</td>
                    <td data-label="Amount">{formatMoney(order.total || 0)}</td>
                    <td data-label="Customer">{order.customerName}</td>
                    <td data-label="Status">
                      <span className={`admin-badge ${getOrderTone(order.orderStatus)}`}>
                        {toTitleCase(order.orderStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!recentOrders.length ? <EmptyRow colSpan={5} label="No recent orders yet." /> : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <aside className="admin-page-side">
        <section className="admin-surface-card">
          <AdminSectionHeader
            eyebrow="Menu focus"
            title="Trending dishes"
            description="A visual shortlist for the items guests are most likely to notice."
          />
          <div className="admin-feature-list">
            {trendingItems.map((item) => (
              <article key={item.id} className="admin-feature-row">
                <Image
                  src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"}
                  alt={item.name}
                  width={160}
                  height={112}
                  sizes="160px"
                />
                <div>
                  <h4>{item.name}</h4>
                  <p>{item.description || "Menu item ready to highlight on the storefront."}</p>
                  <strong>{formatMoney(item.basePrice)}</strong>
                </div>
              </article>
            ))}
            {!trendingItems.length ? (
              <div className="admin-empty-card">No menu items available yet.</div>
            ) : null}
          </div>
        </section>

        <section className="admin-surface-card">
          <AdminSectionHeader
            eyebrow="Live notes"
            title="Recent activity"
            description="Short operational events pulled from current order traffic."
          />
          <div className="admin-timeline">
            {pendingOrders.slice(0, 4).map((order) => (
              <article key={order.id} className="admin-timeline-item">
                <h4>{toTitleCase(order.orderStatus)} order</h4>
                <p>
                  {order.customerName} placed {formatMoney(order.total || 0)} via{" "}
                  {toTitleCase(order.fulfillmentType || "online")}.
                </p>
              </article>
            ))}
            {!pendingOrders.length ? (
              <article className="admin-timeline-item">
                <h4>Service is quiet</h4>
                <p>No pending orders right now. The dashboard will update as activity appears.</p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="admin-surface-card">
          <AdminSectionHeader
            eyebrow="Email delivery"
            title="Recent notifications"
            description="Latest SendGrid delivery attempts with failure reasons when a message is rejected."
          />
          <div className="admin-timeline">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`admin-timeline-item ${notification.status === "failed" ? "admin-timeline-item-failed" : ""}`}
              >
                <h4>
                  {notification.status === "failed" ? "Email failed" : "Email sent"} to{" "}
                  {notification.to}
                </h4>
                <p>{notification.subject}</p>
                {notification.providerError ? (
                  <p className="admin-muted-line">{notification.providerError}</p>
                ) : null}
                <span className="admin-muted-line">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </article>
            ))}
            {!notifications.length ? (
              <div className="admin-empty-card">No notification attempts have been recorded yet.</div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function ExtAdminContentPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Storefront"
          title="Homepage content"
          description="Shape the first impression guests see across hero, gallery, and FAQ sections."
        />
        <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/content">

          <div className="admin-field-grid">
            <div>
              <p className="eyebrow">Hero title</p>
              <input name="heroTitle" defaultValue={bundle.content.heroTitle} />
            </div>
            <div>
              <p className="eyebrow">Hero subtitle</p>
              <textarea name="heroSubtitle" rows={3} defaultValue={bundle.content.heroSubtitle} />
            </div>
          </div>
          <div>
            <p className="eyebrow">About section</p>
            <textarea name="about" rows={5} defaultValue={bundle.content.about} />
          </div>
          <div className="admin-field-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`gallery-image-${index}`}>
                <p className="eyebrow">Gallery image {index + 1}</p>
                <input
                  name={`galleryImage_${index}`}
                  defaultValue={bundle.content.galleryImages?.[index] ?? ""}
                />
              </div>
            ))}
          </div>
          <div className="admin-field-grid">
            <div>
              <p className="eyebrow">FAQ question 1</p>
              <input name="faqQuestion1" defaultValue={bundle.content.faq[0]?.question ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ answer 1</p>
              <textarea name="faqAnswer1" rows={4} defaultValue={bundle.content.faq[0]?.answer ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ question 2</p>
              <input name="faqQuestion2" defaultValue={bundle.content.faq[1]?.question ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ answer 2</p>
              <textarea name="faqAnswer2" rows={4} defaultValue={bundle.content.faq[1]?.answer ?? ""} />
            </div>
          </div>
          <button type="submit" className="button-primary admin-submit-button">
            Save public website content
          </button>
        </form>
      </article>

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Proof"
          title="Reviews and testimonials"
          description="Keep social proof aligned with the tone of the restaurant and the current menu."
        />
        <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/reviews">

          <div className="admin-panel-grid">
            {Array.from({ length: Math.max(bundle.reviews.length, 4) }, (_, index) => {
              const review = bundle.reviews[index];

              return (
                <section key={review?.id ?? `review-slot-${index}`} className="admin-subcard">
                  <input
                    type="hidden"
                    name={`reviewId_${index}`}
                    value={review?.id ?? `review_${index + 1}`}
                  />
                  <div className="admin-field-grid compact">
                    <div>
                      <p className="eyebrow">Author</p>
                      <input name={`reviewAuthor_${index}`} defaultValue={review?.author ?? ""} />
                    </div>
                    <div>
                      <p className="eyebrow">Rating</p>
                      <input
                        name={`reviewRating_${index}`}
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={review?.rating ?? 5}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow">Review text</p>
                    <textarea
                      name={`reviewContent_${index}`}
                      rows={4}
                      defaultValue={review?.content ?? ""}
                    />
                  </div>
                </section>
              );
            })}
          </div>
          <button type="submit" className="button-primary admin-submit-button">
            Save reviews
          </button>
        </form>
      </article>

      <article className="admin-surface-card admin-info-strip">
        <div>
          <p className="eyebrow">Editable sections</p>
          <h3>What this screen controls</h3>
        </div>
        <div className="admin-inline-notes">
          <span>Hero and CTA areas</span>
          <span>Featured dishes</span>
          <span>Gallery, reviews, FAQ</span>
        </div>
      </article>
    </section>
  );
}

export function ExtAdminMenuPage({
  bundle,
  menu
}: {
  bundle: TenantBundle;
  menu: {
    categories: TenantBundle["categories"];
    menuItems: TenantBundle["menuItems"];
  };
}) {
  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Catalog"
          title="Menu editor"
          description="Manage categories, item visibility, pricing, and menu presentation from one workspace."
        />
        <div className="admin-panel-grid split">
          <section className="admin-subcard">
            <h3>Add category</h3>
            <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/menu/categories/create">
    
              <input name="name" placeholder="Category name" />
              <input name="slug" placeholder="category-slug" />
              <input name="description" placeholder="Short category description" />
              <label className="choice-card">
                <input type="checkbox" name="visible" defaultChecked />
                <span>Visible on public menu</span>
              </label>
              <button type="submit" className="button-primary admin-submit-button">
                Add category
              </button>
            </form>
          </section>

          <section className="admin-subcard">
            <h3>Add menu item</h3>
            <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/menu/items/create">
    
              <input name="name" placeholder="Dish name" />
              <input name="slug" placeholder="dish-slug" />
              <input name="image" placeholder="Image URL" />
              <input name="basePrice" type="number" step="0.1" placeholder="Price" />
              <select name="categoryId" defaultValue={menu.categories[0]?.id}>
                {menu.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <textarea name="description" rows={3} placeholder="Short dish description" />
              <div className="admin-field-grid compact">
                <label className="choice-card">
                  <input type="checkbox" name="available" defaultChecked />
                  <span>Available now</span>
                </label>
                <label className="choice-card">
                  <input type="checkbox" name="featured" />
                  <span>Feature on homepage</span>
                </label>
                <label className="choice-card">
                  <input type="checkbox" name="bestSeller" />
                  <span>Best seller tag</span>
                </label>
              </div>
              <button type="submit" className="button-primary admin-submit-button">
                Add item
              </button>
            </form>
          </section>
        </div>
      </article>

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Structure"
          title="Current categories"
          description="Refine how the public menu is grouped and what guests can browse."
        />
        <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/menu">

          <div className="admin-panel-grid">
            {menu.categories.map((category, index) => (
              <section key={category.id} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Category block</p>
                    <h3>{category.name}</h3>
                  </div>
                  <button
                    type="submit"
                    formAction="/api/v1/extadmin/menu/categories/delete"
                    formMethod="post"
                    name="categoryId"
                    value={category.id}
                    className="button-ghost compact-button"
                  >
                    Delete category
                  </button>
                </div>
                <input type="hidden" name={`categoryId_${index}`} value={category.id} />
                <div className="admin-field-grid compact">
                  <div>
                    <p className="eyebrow">Category name</p>
                    <input name={`categoryName_${index}`} defaultValue={category.name} />
                  </div>
                  <div>
                    <p className="eyebrow">Slug</p>
                    <input name={`categorySlug_${index}`} defaultValue={category.slug} />
                  </div>
                  <div>
                    <p className="eyebrow">Description</p>
                    <input
                      name={`categoryDescription_${index}`}
                      defaultValue={category.description}
                    />
                  </div>
                  <label className="choice-card">
                    <input
                      type="checkbox"
                      name={`categoryVisible_${index}`}
                      defaultChecked={category.visible}
                    />
                    <span>Visible on public menu</span>
                  </label>
                </div>
              </section>
            ))}
          </div>

          <AdminSectionHeader
            eyebrow="Products"
            title="Menu items"
            description="Tune dish details, category assignment, and feature flags without leaving the editor."
          />

          <div className="admin-panel-grid">
            {menu.menuItems.map((item, index) => (
              <section key={item.id} className="admin-subcard">
                <input type="hidden" name={`itemId_${index}`} value={item.id} />
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Menu item</p>
                    <h3>{item.name}</h3>
                  </div>
                  <button
                    type="submit"
                    formAction="/api/v1/extadmin/menu/items/delete"
                    formMethod="post"
                    name="itemId"
                    value={item.id}
                    className="button-ghost compact-button"
                  >
                    Delete item
                  </button>
                </div>
                <div className="admin-field-grid compact">
                  <div>
                    <p className="eyebrow">Item name</p>
                    <input name={`itemName_${index}`} defaultValue={item.name} />
                  </div>
                  <div>
                    <p className="eyebrow">Slug</p>
                    <input name={`itemSlug_${index}`} defaultValue={item.slug} />
                  </div>
                  <div>
                    <p className="eyebrow">Price</p>
                    <input name={`itemPrice_${index}`} type="number" step="0.1" defaultValue={item.basePrice} />
                  </div>
                  <div>
                    <p className="eyebrow">Image URL</p>
                    <input name={`itemImage_${index}`} defaultValue={item.image} />
                  </div>
                  <div>
                    <p className="eyebrow">Primary category</p>
                    <select
                      name={`itemCategoryId_${index}`}
                      defaultValue={item.categoryIds[0] ?? menu.categories[0]?.id}
                    >
                      {menu.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field-grid compact">
                    <label className="choice-card">
                      <input type="checkbox" name={`itemAvailable_${index}`} defaultChecked={item.available} />
                      <span>Available now</span>
                    </label>
                    <label className="choice-card">
                      <input type="checkbox" name={`itemFeatured_${index}`} defaultChecked={item.featured} />
                      <span>Featured on homepage</span>
                    </label>
                    <label className="choice-card">
                      <input type="checkbox" name={`itemBestSeller_${index}`} defaultChecked={item.bestSeller} />
                      <span>Best seller label</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Description</p>
                  <textarea name={`itemDescription_${index}`} rows={4} defaultValue={item.description} />
                </div>
              </section>
            ))}
          </div>

          <button type="submit" className="button-primary admin-submit-button">
            Save menu changes
          </button>
        </form>
      </article>
    </section>
  );
}

export function ExtAdminOrdersPage({ bundle }: { bundle: TenantBundle }) {
  const deliveryOrders = bundle.orders.filter((order) => order.fulfillmentType === "delivery");

  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Dispatch"
          title="Delivery board"
          description="Manage delivery-specific stages, assign drivers manually, and keep customer tracking updated."
        />
        <div className="admin-panel-grid">
          {deliveryOrders.map((order) => (
            <section key={order.id} className="admin-subcard delivery-dispatch-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Delivery order</p>
                  <h3>{order.orderNumber}</h3>
                  <p>{order.customerName} | {formatMoney(order.total)}</p>
                </div>
                {order.deliveryTracking ? (
                  <Link href={`/track/${order.deliveryTracking.trackingToken}`} className="button-ghost compact-button">
                    Open tracking link
                  </Link>
                ) : null}
              </div>

              <div className="admin-field-grid compact">
                <div>
                  <p className="eyebrow">Kitchen stage</p>
                  <form method="post" action="/api/v1/extadmin/orders/status" className="form-grid admin-form-stack">
          
                    <input type="hidden" name="orderId" value={order.id} />
                    <select name="orderStatus" defaultValue={order.orderStatus}>
                      <option value="pending_payment">Pending payment</option>
                      <option value="placed">Placed</option>
                      <option value="accepted">Accepted</option>
                      <option value="preparing">Preparing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <button type="submit" className="button-ghost compact-button">Save kitchen stage</button>
                  </form>
                </div>

                <div>
                  <p className="eyebrow">Assign driver</p>
                  <form method="post" action="/api/v1/extadmin/orders/assign-driver" className="form-grid admin-form-stack">
          
                    <input type="hidden" name="orderId" value={order.id} />
                    <select name="driverId" defaultValue={order.deliveryTracking?.assignedDriverId ?? ""}>
                      <option value="">Unassigned</option>
                      {bundle.drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} | {driver.vehicleLabel} {driver.active ? "" : "(Inactive)"}
                        </option>
                      ))}
                    </select>
                    <input
                      name="etaMinutes"
                      type="number"
                      min="5"
                      max="180"
                      placeholder="ETA in minutes"
                    />
                    <button type="submit" className="button-ghost compact-button">Save driver</button>
                  </form>
                </div>

                <div>
                  <p className="eyebrow">Dispatch milestone</p>
                  <form method="post" action="/api/v1/extadmin/orders/delivery-status" className="form-grid admin-form-stack">
          
                    <input type="hidden" name="orderId" value={order.id} />
                    <select
                      name="deliveryStatus"
                      defaultValue={order.deliveryTracking?.deliveryStatus ?? "awaiting_dispatch"}
                    >
                      <option value="awaiting_dispatch">Awaiting dispatch</option>
                      <option value="driver_assigned">Driver assigned</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="arriving">Arriving</option>
                      <option value="delivered">Delivered</option>
                      <option value="delivery_failed">Delivery failed</option>
                    </select>
                    <input
                      name="etaMinutes"
                      type="number"
                      min="5"
                      max="180"
                      placeholder="Refresh ETA in minutes"
                    />
                    <button type="submit" className="button-primary admin-submit-button">Update dispatch</button>
                  </form>
                </div>
              </div>

              <div className="admin-breakdown-list">
                <div className="admin-breakdown-row">
                  <strong>Tracking stage</strong>
                  <span>{order.deliveryTracking ? toTitleCase(order.deliveryTracking.deliveryStatus) : "Not started"}</span>
                </div>
                <div className="admin-breakdown-row">
                  <strong>Assigned driver</strong>
                  <span>{order.deliveryTracking?.assignedDriverName ?? "None"}</span>
                </div>
                <div className="admin-breakdown-row">
                  <strong>ETA</strong>
                  <span>
                    {order.deliveryTracking?.estimatedDeliveredAt
                      ? new Date(order.deliveryTracking.estimatedDeliveredAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "Pending"}
                  </span>
                </div>
                <div className="admin-breakdown-row">
                  <strong>Address</strong>
                  <span>{order.address || "Missing delivery address"}</span>
                </div>
                <div className="admin-breakdown-row">
                  <strong>Printing</strong>
                  <span>{getPrintLabel(order)}</span>
                </div>
                <div className="admin-breakdown-row">
                  <strong>Print count</strong>
                  <span>{String(order.printState?.printCount ?? 0)}</span>
                </div>
                {order.printState?.lastPrintError ? (
                  <div className="admin-breakdown-row">
                    <strong>Last print error</strong>
                    <span>{order.printState.lastPrintError}</span>
                  </div>
                ) : null}
              </div>
            </section>
          ))}
          {!deliveryOrders.length ? <div className="admin-empty-card">No delivery orders waiting for dispatch.</div> : null}
        </div>
      </article>

      <article className="admin-surface-card admin-table-card">
        <AdminSectionHeader
          eyebrow="Service"
          title="Full order queue"
          description="Keep kitchen and payment statuses aligned for every order type."
        />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Fulfilment</th>
                <th>Status</th>
                <th>Printing</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bundle.orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Order">{order.orderNumber}</td>
                  <td data-label="Customer">{order.customerName}</td>
                  <td data-label="Fulfilment">{toTitleCase(order.fulfillmentType || "online")}</td>
                  <td data-label="Status">
                    <form method="post" action="/api/v1/extadmin/orders/status" className="inline-status-form admin-inline-form">
            
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="orderStatus" defaultValue={order.orderStatus}>
                        <option value="pending_payment">Pending payment</option>
                        <option value="placed">Placed</option>
                        <option value="accepted">Accepted</option>
                        <option value="preparing">Preparing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                      <button type="submit" className="button-ghost compact-button">
                        Save
                      </button>
                    </form>
                  </td>
                  <td data-label="Printing">
                    <div className="admin-breakdown-list compact">
                      <div className="admin-breakdown-row">
                        <strong>
                          <span className={`admin-badge ${getPrintTone(order)}`}>
                            {getPrintLabel(order)}
                          </span>
                        </strong>
                        <span>
                          {order.printState?.lastPrintedAt
                            ? new Date(order.printState.lastPrintedAt).toLocaleString()
                            : "No successful print yet"}
                        </span>
                      </div>
                      <div className="admin-breakdown-row">
                        <strong>Reprints</strong>
                        <span>{String(order.printState?.reprintCount ?? 0)}</span>
                      </div>
                      {order.printState?.lastPrintError ? (
                        <div className="admin-breakdown-row">
                          <strong>Last error</strong>
                          <span>{order.printState.lastPrintError}</span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td data-label="Total">{formatMoney(order.total)}</td>
                  <td data-label="Action">
                    <form method="post" action="/api/v1/extadmin/orders/reprint" className="admin-inline-form">
            
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="reason" value="Manual reprint from owner portal" />
                      <button type="submit" className="button-ghost compact-button">
                        Reprint kitchen ticket
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!bundle.orders.length ? <EmptyRow colSpan={7} label="No orders yet." /> : null}
            </tbody>
          </table>
        </div>
      </article>

    </section>
  );
}

export function ExtAdminBookingsPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card admin-table-card">
        <AdminSectionHeader
          eyebrow="Reservations"
          title="Booking requests"
          description="Keep table availability aligned with demand and confirm guest plans quickly."
        />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Date</th>
                <th>Time</th>
                <th>Party</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bundle.bookings.map((booking) => (
                <tr key={booking.id}>
                  <td data-label="Guest">{booking.customerName}</td>
                  <td data-label="Date">{booking.bookingDate}</td>
                  <td data-label="Time">{booking.bookingTime}</td>
                  <td data-label="Party">{booking.partySize}</td>
                  <td data-label="Status">
                    <form method="post" action="/api/v1/extadmin/bookings/status" className="inline-status-form admin-inline-form">
            
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <select name="status" defaultValue={booking.status}>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button type="submit" className="button-ghost compact-button">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!bundle.bookings.length ? <EmptyRow colSpan={5} label="No booking requests yet." /> : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export function ExtAdminSettingsPage({ bundle }: { bundle: TenantBundle }) {
  const domains = (bundle as TenantBundle & { domains?: Array<{ domain: string; domainType: "subdomain" | "custom"; isPrimary: boolean; verificationStatus: string }> }).domains ?? [];

  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Business profile"
          title="Restaurant settings"
          description="Update operating information used across the public storefront and service flows."
        />
        <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/settings">

          <div className="admin-field-grid">
            <div>
              <p className="eyebrow">Restaurant name</p>
              <input name="name" defaultValue={bundle.tenant.name} />
            </div>
            <div>
              <p className="eyebrow">Cuisine</p>
              <input name="cuisine" defaultValue={bundle.tenant.cuisine} />
            </div>
            <div>
              <p className="eyebrow">Phone</p>
              <input name="phone" defaultValue={bundle.tenant.phone} />
            </div>
            <div>
              <p className="eyebrow">Email</p>
              <input name="email" defaultValue={bundle.tenant.email} />
            </div>
          </div>
          <div>
            <p className="eyebrow">Address</p>
            <input name="address" defaultValue={bundle.tenant.address} />
          </div>
          <div>
            <p className="eyebrow">Business description</p>
            <textarea name="description" rows={4} defaultValue={bundle.tenant.description} />
          </div>
          <div>
            <p className="eyebrow">Delivery postcodes</p>
            <textarea
              name="deliveryPostcodes"
              rows={4}
              defaultValue={bundle.tenant.deliveryPostcodes.join(", ")}
            />
          </div>
          <button type="submit" className="button-primary admin-submit-button">
            Save restaurant settings
          </button>
        </form>
      </article>

      {domains.length > 0 ? (
        <article className="admin-surface-card">
          <AdminSectionHeader
            eyebrow="Connected domains"
            title="Website domains"
            description="Domains assigned to this restaurant. Contact platform support to add or change domains."
          />
          <ul className="plain-list admin-coverage-list">
            {domains.map((domain) => (
              <li key={domain.domain}>
                <strong>{domain.domain}</strong>
                <span>
                  {domain.domainType} | {domain.isPrimary ? "Primary" : "Secondary"} | {domain.verificationStatus}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Coverage"
          title="Current delivery coverage"
          description="A quick list of active postcodes served by the restaurant."
        />
        <ul className="plain-list admin-coverage-list">
          {bundle.tenant.deliveryPostcodes.map((postcode) => (
            <li key={postcode}>
              <strong>{postcode}</strong>
              <span>Delivery enabled</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function ExtAdminStaffPage({
  bundle,
  auditEntries,
  status,
  message
}: {
  bundle: TenantBundle;
  auditEntries: AuditEntry[];
  status?: string;
  message?: string;
}) {
  return (
    <section className="admin-page-stack">
      {message ? (
        <article className={`admin-surface-card ${status === "error" ? "notice-error" : "notice-success"}`}>
          <strong>{status === "error" ? "Could not complete that action." : "Saved."}</strong>
          <p>{message}</p>
        </article>
      ) : null}

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Team access"
          title="Staff accounts"
          description="Create logins, assign roles, and keep internal access aligned with current operations."
        />
        <div className="admin-panel-grid split">
          <section className="admin-subcard">
            <h3>Create staff account</h3>
            <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/staff/create">
    
              <input name="name" placeholder="Full name" />
              <input name="email" type="email" placeholder="staff@bellaroma.test" />
              <input name="password" type="password" placeholder="Temporary password" />
              <select name="roleId" defaultValue={bundle.roles[0]?.id}>
                {bundle.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="button-primary admin-submit-button">
                Create staff account
              </button>
            </form>
          </section>

          <section className="admin-subcard">
            <h3>Access notes</h3>
            <ul className="plain-list">
              <li><strong>Owner login</strong><span>Configured from env or seeded into Mongo automatically.</span></li>
              <li><strong>Staff accounts</strong><span>Created here and reassigned without code changes.</span></li>
              <li><strong>Access control</strong><span>Role assignment persists with each admin account.</span></li>
              <li><strong>Validation</strong><span>Duplicate emails and weak passwords are blocked server-side.</span></li>
            </ul>
            <p className="admin-helper-copy">
              Client order emails can be assigned per account in the access cards below.
            </p>
          </section>
        </div>
      </article>

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Active team"
          title="Existing team members"
          description="Review role assignments, revoke access, or reset credentials."
        />
        <div className="admin-panel-grid">
          {bundle.staff.map((member) => (
            <section key={member.id} className="admin-subcard">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Staff account</p>
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                </div>
                <form method="post" action="/api/v1/extadmin/staff/delete">
        
                  <input type="hidden" name="userId" value={member.id} />
                  <button type="submit" className="button-ghost compact-button">
                    Remove access
                  </button>
                </form>
              </div>

              <div className="admin-field-grid compact">
                <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/staff/role">
        
                  <input type="hidden" name="userId" value={member.id} />
                  <p className="eyebrow">Assigned role</p>
                  <select name="roleId" defaultValue={member.roleIds[0] ?? bundle.roles[0]?.id}>
                    {bundle.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <p className="eyebrow">Order emails</p>
                  <label className="admin-checkbox-row">
                    <input
                      type="checkbox"
                      name="orderEmailsEnabled"
                      value="true"
                      defaultChecked={member.orderEmailsEnabled}
                    />
                    <span>Receives order emails</span>
                  </label>
                  <button type="submit" className="button-ghost compact-button">
                    Save role
                  </button>
                </form>

                <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/staff/password">
        
                  <input type="hidden" name="userId" value={member.id} />
                  <p className="eyebrow">Reset password</p>
                  <input name="password" type="password" placeholder="New password" />
                  <button type="submit" className="button-ghost compact-button">
                    Update password
                  </button>
                </form>
              </div>
            </section>
          ))}
        </div>
      </article>

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Audit"
          title="Recent access activity"
          description="A short timeline of user management and privileged admin actions."
        />
        <ul className="plain-list">
          {auditEntries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.summary}</strong>
              <span>{entry.actorEmail} | {new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function ExtAdminMediaPage({
  assets
}: {
  assets: Array<{
    id: string;
    label: string;
    url: string;
    kind: string;
    createdAt: string;
  }>;
}) {
  return (
    <section className="admin-page-stack">
      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Library"
          title="Media assets"
          description="Store reusable imagery for homepage sections, gallery modules, and future campaigns."
        />
        <div className="admin-panel-grid split">
          <section className="admin-subcard">
            <h3>Add media asset</h3>
            <form className="form-grid admin-form-stack" method="post" action="/api/v1/extadmin/media/create">

              <input name="label" placeholder="Asset label" />
              <input name="url" placeholder="https://..." />
              <select name="kind" defaultValue="gallery">
                <option value="gallery">Gallery</option>
                <option value="hero">Hero</option>
                <option value="general">General</option>
              </select>
              <button type="submit" className="button-primary admin-submit-button">
                Save asset
              </button>
            </form>
          </section>

          <section className="admin-subcard">
            <h3>Upload image</h3>
            <form
              className="form-grid admin-form-stack"
              method="post"
              action="/api/v1/extadmin/media/upload"
              encType="multipart/form-data"
            >

              <input name="label" placeholder="Uploaded asset label" />
              <select name="kind" defaultValue="gallery">
                <option value="gallery">Gallery</option>
                <option value="hero">Hero</option>
                <option value="general">General</option>
              </select>
              <input name="file" type="file" accept="image/*" />
              <button type="submit" className="button-ghost compact-button">
                Upload image
              </button>
            </form>
          </section>
        </div>
      </article>

      <article className="admin-surface-card">
        <AdminSectionHeader
          eyebrow="Inventory"
          title="Saved assets"
          description="A browsable list of links already approved for the restaurant website."
        />
        <div className="admin-panel-grid">
          {assets.length ? (
            assets.map((asset) => (
              <section key={asset.id} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{asset.kind}</p>
                    <h3>{asset.label}</h3>
                    <p>{asset.url}</p>
                    <span className="admin-muted-line">Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                  <form method="post" action="/api/v1/extadmin/media/delete">
      
                    <input type="hidden" name="assetId" value={asset.id} />
                    <button type="submit" className="button-ghost compact-button">
                      Delete asset
                    </button>
                  </form>
                </div>
              </section>
            ))
          ) : (
            <div className="admin-empty-card">No media assets saved yet.</div>
          )}
        </div>
      </article>
    </section>
  );
}
