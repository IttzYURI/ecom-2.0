import Link from "next/link";

import type { Order, PrintStation } from "@rcc/contracts";

import { CreateBusinessModal } from "./platform-create-business-modal";

import type {
  PlatformDashboardData,
  PlatformRestaurantProvisionResult,
  PlatformTenantDetail,
  PlatformTenantListItem
} from "../lib/platform-admin-service";
import type { PlatformFeatureKey } from "../lib/platform-tenant-store";
import type { TenantFeatureFlagsRecord } from "../lib/tenant-feature-flags-store";
import type { TenantSetupRecord } from "../lib/tenant-setup-store";

const FEATURE_LABELS: Record<PlatformFeatureKey, { title: string; description: string }> = {
  storefront: {
    title: "Storefront",
    description: "Public website and customer ordering pages."
  },
  restaurant_admin: {
    title: "Restaurant Admin",
    description: "Tenant-side admin workspace and content control."
  },
  menu_management: {
    title: "Menu Management",
    description: "Categories, menu items, and visibility updates."
  },
  bookings: {
    title: "Bookings",
    description: "Table reservations and booking workflow."
  },
  delivery: {
    title: "Delivery",
    description: "Delivery coverage, driver dispatch, and tracking."
  },
  customer_accounts: {
    title: "Customer Accounts",
    description: "Customer sign-in, saved profiles, and order history."
  },
  stripe_payments: {
    title: "Stripe Payments",
    description: "Online card payments and payment confirmations."
  },
  printing: {
    title: "Printing",
    description: "Kitchen tickets, stations, and printer heartbeat."
  },
  custom_domains: {
    title: "Custom Domains",
    description: "Primary domain mapping and branded hostnames."
  },
  gallery: {
    title: "Gallery",
    description: "Photo gallery and visual content for the storefront."
  },
  promotions: {
    title: "Promotions",
    description: "Discount codes, special offers, and promotional campaigns."
  },
  advanced_reports: {
    title: "Advanced Reports",
    description: "Detailed analytics, revenue reports, and operational insights."
  }
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No activity yet";
  }

  return new Date(value).toLocaleString();
}

function getStatusTone(status: string) {
  if (status === "active" || status === "online" || status === "verified") {
    return "success";
  }

  if (status === "trialing" || status === "degraded" || status === "pending" || status === "past_due") {
    return "warning";
  }

  return "danger";
}

function FlashMessage({
  status,
  message
}: {
  status?: string;
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <article className={`panel platform-flash ${status === "error" ? "is-error" : "is-success"}`}>
      <strong>{status === "error" ? "Action failed" : "Saved"}</strong>
      <p>{message}</p>
    </article>
  );
}

function MetricCards({ dashboard }: { dashboard: PlatformDashboardData }) {
  return (
    <section className="platform-metric-grid">
      {dashboard.metrics.map((metric) => (
        <article key={metric.label} className={`panel platform-metric-card tone-${metric.tone}`}>
          <p className="eyebrow">{metric.label}</p>
          <h2>{metric.value}</h2>
        </article>
      ))}
    </section>
  );
}

function RestaurantTable({
  restaurants,
  showActions = true
}: {
  restaurants: PlatformTenantListItem[];
  showActions?: boolean;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Status</th>
            <th>Plan</th>
            <th>Primary domain</th>
            <th>Printing</th>
            <th>Recent orders</th>
            {showActions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {restaurants.map((restaurant) => {
            const primaryDomain =
              restaurant.domains.find((domain) => domain.isPrimary)?.domain ??
              restaurant.domains[0]?.domain ??
              "Not configured";

            return (
              <tr key={restaurant.tenant.id}>
                <td data-label="Restaurant">
                  <div className="platform-table-primary">
                    <strong>{restaurant.tenant.name}</strong>
                    <span>{restaurant.tenant.id}</span>
                  </div>
                </td>
                <td data-label="Status">
                  <span className={`admin-badge ${getStatusTone(restaurant.tenant.status)}`}>
                    {restaurant.tenant.status}
                  </span>
                </td>
                <td data-label="Plan">
                  {restaurant.subscription ? (
                    <div className="platform-table-primary">
                      <strong>{restaurant.subscription.planCode}</strong>
                      <span>{restaurant.subscription.status}</span>
                    </div>
                  ) : (
                    "Not set"
                  )}
                </td>
                <td data-label="Primary domain">{primaryDomain}</td>
                <td data-label="Printing">
                  <div className="platform-table-primary">
                    <strong>{restaurant.printerSummary.status.replaceAll("_", " ")}</strong>
                    <span>
                      {restaurant.printerSummary.onlineStations}/{restaurant.printerSummary.totalStations} online
                    </span>
                  </div>
                </td>
                <td data-label="Recent orders">
                  <div className="platform-table-primary">
                    <strong>{restaurant.orderSummary.totalOrders}</strong>
                    <span>{formatMoney(restaurant.orderSummary.grossRevenue)}</span>
                  </div>
                </td>
                {showActions ? (
                  <td data-label="Actions">
                    <div className="platform-table-actions">
                      <a href={`/platform/tenants/${restaurant.tenant.id}`} className="button-ghost compact-button">
                        Manage
                      </a>
                      <a href={restaurant.adminLoginPath} className="button-ghost compact-button">
                        Open admin
                      </a>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
          {!restaurants.length ? (
            <tr>
              <td colSpan={showActions ? 7 : 6}>No restaurants found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const BUSINESS_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "pizzeria", label: "Pizzeria" },
  { value: "cafe", label: "Cafe" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "takeaway", label: "Takeaway" },
  { value: "ghost_kitchen", label: "Ghost Kitchen" }
];

const THEME_OPTIONS = [
  { value: "sunset", label: "Sunset" },
  { value: "forest", label: "Forest" },
  { value: "midnight", label: "Midnight" },
  { value: "minimal", label: "Minimal" }
];

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" }
];

function CreateRestaurantForm() {
  return (
    <article className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h2>Create restaurant workspace</h2>
          <p>Provision tenant, owner access, launch settings, website defaults, menu skeleton, printer config, and audit trail.</p>
        </div>
      </div>
      <form
        className="form-grid platform-form-grid platform-provision-form"
        action="/api/v1/platform/tenants"
        method="post"
        encType="multipart/form-data"
      >
        <section className="platform-form-section">
          <div className="platform-form-section-copy">
            <p className="eyebrow">Restaurant details</p>
            <h3>Business profile</h3>
            <p>Base identity, contacts, address, and brand defaults.</p>
          </div>
          <div className="platform-form-section-grid">
            <label className="platform-field">
              <span>Business name</span>
              <input name="businessName" placeholder="North Wharf Kitchen" required />
            </label>
            <label className="platform-field">
              <span>Business type</span>
              <select name="businessType" defaultValue="restaurant">
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="platform-field">
              <span>Email</span>
              <input name="email" type="email" placeholder="ops@northwharf.com" required />
            </label>
            <label className="platform-field">
              <span>Phone</span>
              <input name="phone" placeholder="+44 20 7000 0000" />
            </label>
            <label className="platform-field platform-field-full">
              <span>Address</span>
              <textarea name="address" rows={3} placeholder="1 River Walk" />
            </label>
            <label className="platform-field">
              <span>Postcode</span>
              <input name="postcode" placeholder="E14 9AB" />
            </label>
            <label className="platform-field">
              <span>Logo optional</span>
              <input name="logo" type="file" accept="image/*" />
            </label>
            <label className="platform-field">
              <span>Default currency</span>
              <select name="defaultCurrency" defaultValue="GBP">
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="platform-field">
              <span>Timezone</span>
              <input name="timezone" defaultValue="Europe/London" />
            </label>
          </div>
        </section>

        <section className="platform-form-section">
          <div className="platform-form-section-copy">
            <p className="eyebrow">Owner account</p>
            <h3>First owner access</h3>
            <p>Create owner user with temp password or invite link.</p>
          </div>
          <div className="platform-form-section-grid">
            <label className="platform-field">
              <span>Owner name</span>
              <input name="ownerName" placeholder="Alex Morgan" required />
            </label>
            <label className="platform-field">
              <span>Owner email</span>
              <input name="ownerEmail" type="email" placeholder="owner@northwharf.com" required />
            </label>
            <label className="platform-field">
              <span>Access mode</span>
              <select name="ownerAccessMode" defaultValue="temporary_password">
                <option value="temporary_password">Temporary password</option>
                <option value="invite_link">Invite link</option>
              </select>
            </label>
            <label className="platform-field">
              <span>Temporary password optional</span>
              <input name="temporaryPassword" placeholder="Auto-generated if blank" />
            </label>
          </div>
        </section>

        <section className="platform-form-section">
          <div className="platform-form-section-copy">
            <p className="eyebrow">Website setup</p>
            <h3>Tenant launch surface</h3>
            <p>Subdomain, domain placeholder, homepage copy, and theme seed.</p>
          </div>
          <div className="platform-form-section-grid">
            <label className="platform-field">
              <span>Subdomain</span>
              <input name="subdomain" placeholder="northwharf" required />
            </label>
            <label className="platform-field">
              <span>Custom domain placeholder</span>
              <input name="customDomain" placeholder="orders.northwharf.com" />
            </label>
            <label className="platform-field platform-field-full">
              <span>Homepage title</span>
              <input name="homepageTitle" placeholder="Order direct from North Wharf Kitchen." required />
            </label>
            <label className="platform-field platform-field-full">
              <span>Short description</span>
              <textarea
                name="shortDescription"
                rows={3}
                placeholder="Fast direct ordering, delivery, collection, and restaurant updates in one branded storefront."
                required
              />
            </label>
            <label className="platform-field">
              <span>Theme preset</span>
              <select name="themePreset" defaultValue="sunset">
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="platform-form-section">
          <div className="platform-form-section-copy">
            <p className="eyebrow">Ordering settings</p>
            <h3>Operational defaults</h3>
            <p>Seed collection, delivery timing, radius, thresholds, and delivery fee.</p>
          </div>
          <div className="platform-form-section-grid">
            <label className="platform-checkbox">
              <input type="checkbox" name="collectionEnabled" value="true" defaultChecked />
              <span>Collection enabled</span>
            </label>
            <label className="platform-checkbox">
              <input type="checkbox" name="deliveryEnabled" value="true" defaultChecked />
              <span>Delivery enabled</span>
            </label>
            <label className="platform-field">
              <span>Default collection time</span>
              <input name="defaultCollectionTimeMinutes" type="number" min="5" defaultValue="20" />
            </label>
            <label className="platform-field">
              <span>Default delivery time</span>
              <input name="defaultDeliveryTimeMinutes" type="number" min="5" defaultValue="45" />
            </label>
            <label className="platform-field">
              <span>Delivery radius</span>
              <input name="deliveryRadiusMiles" type="number" min="0" step="0.5" defaultValue="5" />
            </label>
            <label className="platform-field">
              <span>Minimum order amount</span>
              <input name="minimumOrderAmount" type="number" min="0" step="0.01" defaultValue="15" />
            </label>
            <label className="platform-field">
              <span>Delivery fee</span>
              <input name="deliveryFee" type="number" min="0" step="0.01" defaultValue="2.99" />
            </label>
          </div>
        </section>

        <section className="platform-form-section">
          <div className="platform-form-section-copy">
            <p className="eyebrow">Feature settings</p>
            <h3>Modules and payment modes</h3>
            <p>Enable only features restaurant should see on day one.</p>
          </div>
          <div className="platform-feature-grid">
            <label className="platform-feature-card">
              <input type="checkbox" name="onlineOrdering" value="true" defaultChecked />
              <div>
                <strong>Online ordering</strong>
                <span>Public storefront and direct order flow.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="cashPayment" value="true" defaultChecked />
              <div>
                <strong>Cash payment</strong>
                <span>Cash collection and delivery payment option.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="cardPayment" value="true" defaultChecked />
              <div>
                <strong>Card payment</strong>
                <span>Stripe-backed online card checkout.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="customerLogin" value="true" defaultChecked />
              <div>
                <strong>Customer login</strong>
                <span>Accounts, order history, and saved customer identity.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="tableBooking" value="true" defaultChecked />
              <div>
                <strong>Table booking</strong>
                <span>Reservation flow and booking management.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="reviews" value="true" defaultChecked />
              <div>
                <strong>Reviews</strong>
                <span>Public review sections and admin moderation.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="printerIntegration" value="true" defaultChecked />
              <div>
                <strong>Printer integration</strong>
                <span>Kitchen print queue and station registration.</span>
              </div>
            </label>
            <label className="platform-feature-card">
              <input type="checkbox" name="driverModule" value="true" />
              <div>
                <strong>Driver module</strong>
                <span>Driver login, assignment, and live delivery updates.</span>
              </div>
            </label>
          </div>
        </section>

        <button type="submit" className="button-primary">
          Create restaurant workspace
        </button>
      </form>
    </article>
  );
}

function SimplePieChart({ slices }: { slices: Array<{ label: string; value: number; color: string }> }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <div className="chart-empty">No data</div>;
  }

  let cumulative = 0;
  const paths = slices.map((slice) => {
    const fraction = slice.value / total;
    const startAngle = cumulative * 360 - 90;
    cumulative += fraction;
    const endAngle = cumulative * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const cx = 80;
    const cy = 80;
    const r = 65;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    if (slice.value === 0) {
      return null;
    }

    return (
      <path
        key={slice.label}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
      />
    );
  });

  return (
    <svg viewBox="0 0 160 160" className="chart-svg">
      {paths}
      <circle cx={80} cy={80} r={40} fill="rgba(255,250,243,0.95)" />
      <text x={80} y={76} textAnchor="middle" className="chart-center-value">{total}</text>
      <text x={80} y={92} textAnchor="middle" className="chart-center-label">total</text>
    </svg>
  );
}

function SimpleBarChart({ bars }: { bars: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="bar-chart">
      {bars.map((bar) => (
        <div key={bar.label} className="bar-chart-row">
          <span className="bar-chart-label">{bar.label}</span>
          <div className="bar-chart-track">
            <div
              className="bar-chart-fill"
              style={{
                width: `${(bar.value / max) * 100}%`,
                background: bar.color
              }}
            />
          </div>
          <span className="bar-chart-value">{bar.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ slices, centerLabel }: { slices: Array<{ label: string; value: number; color: string }>; centerLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <div className="chart-empty">No data</div>;
  }

  let cumulative = 0;
  const paths = slices.map((slice) => {
    const fraction = slice.value / total;
    const startAngle = cumulative * 360 - 90;
    cumulative += fraction;
    const endAngle = cumulative * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const outerR = 65;
    const innerR = 45;
    const cx = 80;
    const cy = 80;

    const ox1 = cx + outerR * Math.cos(startRad);
    const oy1 = cy + outerR * Math.sin(startRad);
    const ox2 = cx + outerR * Math.cos(endRad);
    const oy2 = cy + outerR * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(endRad);
    const iy1 = cy + innerR * Math.sin(endRad);
    const ix2 = cx + innerR * Math.cos(startRad);
    const iy2 = cy + innerR * Math.sin(startRad);

    if (slice.value === 0) {
      return null;
    }

    return (
      <path
        key={slice.label}
        d={`M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`}
        fill={slice.color}
      />
    );
  });

  return (
    <svg viewBox="0 0 160 160" className="chart-svg">
      {paths}
      <text x={80} y={76} textAnchor="middle" className="chart-center-value">{total}</text>
      <text x={80} y={92} textAnchor="middle" className="chart-center-label">{centerLabel}</text>
    </svg>
  );
}

export function PlatformOverview({
  dashboard,
  status,
  message
}: {
  dashboard: PlatformDashboardData;
  status?: string;
  message?: string;
}) {
  const { restaurants } = dashboard;

  const activeCount = restaurants.filter((r) => r.tenant.status === "active").length;
  const trialingCount = restaurants.filter((r) => r.tenant.status === "trialing").length;
  const suspendedCount = restaurants.filter((r) => r.tenant.status === "suspended").length;
  const archivedCount = restaurants.filter((r) => r.tenant.status === "archived").length;

  const totalOrders = restaurants.reduce((sum, r) => sum + r.orderSummary.totalOrders, 0);
  const activeOrders = restaurants.reduce((sum, r) => sum + r.orderSummary.activeOrders, 0);
  const paidOrders = restaurants.reduce((sum, r) => sum + r.orderSummary.paidOrders, 0);
  const grossRevenue = restaurants.reduce((sum, r) => sum + r.orderSummary.grossRevenue, 0);

  const onlinePrinters = restaurants.filter((r) => r.printerSummary.status === "online").length;
  const degradedPrinters = restaurants.filter((r) => r.printerSummary.status === "degraded").length;
  const offlinePrinters = restaurants.filter((r) => r.printerSummary.status === "offline").length;
  const noPrinters = restaurants.filter((r) => r.printerSummary.status === "not_configured").length;

  const businessesOpen = activeCount;
  const businessesClosed = suspendedCount + archivedCount + trialingCount;

  return (
    <section className="stack-xl">
      <FlashMessage status={status} message={message} />

      <div className="dashboard-metric-grid">
        <article className="panel dashboard-metric-card">
          <div className="dashboard-metric-icon" style={{ background: "rgba(47,106,80,0.12)", color: "#2f6a50" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Total Businesses</p>
            <h2>{restaurants.length}</h2>
          </div>
        </article>
        <article className="panel dashboard-metric-card">
          <div className="dashboard-metric-icon" style={{ background: "rgba(212,91,33,0.12)", color: "#d45b21" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M9 12h6" /><path d="M9 16h6" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Total Orders</p>
            <h2>{totalOrders}</h2>
            <span className="dashboard-metric-sub">{activeOrders} active &middot; {paidOrders} paid</span>
          </div>
        </article>
        <article className="panel dashboard-metric-card">
          <div className="dashboard-metric-icon" style={{ background: "rgba(47,106,80,0.12)", color: "#2f6a50" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Businesses Open</p>
            <h2 className="dashboard-metric-positive">{businessesOpen}</h2>
            <span className="dashboard-metric-sub">{businessesClosed} inactive</span>
          </div>
        </article>
        <article className="panel dashboard-metric-card">
          <div className="dashboard-metric-icon" style={{ background: "rgba(180,140,60,0.12)", color: "#b48c3c" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Gross Revenue</p>
            <h2>{formatMoney(grossRevenue)}</h2>
          </div>
        </article>
      </div>

      <div className="dashboard-charts-grid">
        <article className="panel dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3>Tenant Status</h3>
          </div>
          <div className="dashboard-chart-body">
            <SimplePieChart
              slices={[
                { label: "Active", value: activeCount, color: "#3b9e6f" },
                { label: "Trialing", value: trialingCount, color: "#e8a84c" },
                { label: "Suspended", value: suspendedCount, color: "#c95d3a" },
                { label: "Archived", value: archivedCount, color: "#9e9490" }
              ]}
            />
            <div className="chart-legend">
              <div className="chart-legend-item"><span style={{ background: "#3b9e6f" }} />Active <strong>{activeCount}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#e8a84c" }} />Trialing <strong>{trialingCount}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#c95d3a" }} />Suspended <strong>{suspendedCount}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#9e9490" }} />Archived <strong>{archivedCount}</strong></div>
            </div>
          </div>
        </article>

        <article className="panel dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3>Orders by Tenant</h3>
          </div>
          <div className="dashboard-chart-body">
            <SimpleBarChart
              bars={restaurants.slice(0, 8).map((r, i) => ({
                label: r.tenant.name.length > 16 ? r.tenant.name.slice(0, 14) + "..." : r.tenant.name,
                value: r.orderSummary.totalOrders,
                color: ["#3b9e6f", "#d45b21", "#4a8fd4", "#e8a84c", "#9e6fbf", "#5fbfb0", "#c95d3a", "#7a9e3b"][i % 8]
              }))}
            />
          </div>
        </article>

        <article className="panel dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3>Printer Health</h3>
          </div>
          <div className="dashboard-chart-body">
            <DonutChart
              centerLabel="printers"
              slices={[
                { label: "Online", value: onlinePrinters, color: "#3b9e6f" },
                { label: "Degraded", value: degradedPrinters, color: "#e8a84c" },
                { label: "Offline", value: offlinePrinters, color: "#c95d3a" },
                { label: "Not configured", value: noPrinters, color: "#9e9490" }
              ]}
            />
            <div className="chart-legend">
              <div className="chart-legend-item"><span style={{ background: "#3b9e6f" }} />Online <strong>{onlinePrinters}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#e8a84c" }} />Degraded <strong>{degradedPrinters}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#c95d3a" }} />Offline <strong>{offlinePrinters}</strong></div>
              <div className="chart-legend-item"><span style={{ background: "#9e9490" }} />Not configured <strong>{noPrinters}</strong></div>
            </div>
          </div>
        </article>

        <article className="panel dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h3>Revenue by Tenant</h3>
          </div>
          <div className="dashboard-chart-body">
            <SimpleBarChart
              bars={restaurants.slice(0, 8).map((r, i) => ({
                label: r.tenant.name.length > 16 ? r.tenant.name.slice(0, 14) + "..." : r.tenant.name,
                value: Math.round(r.orderSummary.grossRevenue * 100) / 100,
                color: ["#3b9e6f", "#d45b21", "#4a8fd4", "#e8a84c", "#9e6fbf", "#5fbfb0", "#c95d3a", "#7a9e3b"][i % 8]
              }))}
            />
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>All Businesses</h2>
            <p>Health, subscription state, and operational readiness across every tenant.</p>
          </div>
          <Link href="/platform/tenants" className="text-link">
            Manage businesses
          </Link>
        </div>
        <RestaurantTable restaurants={dashboard.restaurants} />
      </article>
    </section>
  );
}

export function PlatformBusinessesView({
  restaurants,
  status,
  message
}: {
  restaurants: PlatformTenantListItem[];
  status?: string;
  message?: string;
}) {
  const activeRestaurants = restaurants.filter((r) => r.tenant.status === "active" || r.tenant.status === "trialing");

  return (
    <section className="stack-xl">
      <FlashMessage status={status} message={message} />
      <div className="platform-page-header">
        <div>
          <h2>Businesses</h2>
          <p>{activeRestaurants.length} active businesses on the platform.</p>
        </div>
        <CreateBusinessModal />
      </div>
      <article className="panel">
        <RestaurantTable restaurants={activeRestaurants} />
      </article>
    </section>
  );
}

export function PlatformTenantsDirectory({
  restaurants,
  status,
  message
}: {
  restaurants: PlatformTenantListItem[];
  status?: string;
  message?: string;
}) {
  return (
    <section className="stack-xl">
      <FlashMessage status={status} message={message} />
      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Directory</p>
            <h2>All restaurants</h2>
            <p>Manage tenant status, plans, domains, printing health, and safe admin access.</p>
          </div>
        </div>
        <RestaurantTable restaurants={restaurants} />
      </article>
      <CreateRestaurantForm />
    </section>
  );
}

function SetupRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="platform-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function PlatformProvisionSuccessView({
  restaurant,
  setup,
  featureFlags,
  ownerEmail,
  adminUrl,
  publicWebsiteUrl,
  inviteUrl,
  temporaryPassword
}: {
  restaurant: PlatformTenantDetail;
  setup: TenantSetupRecord;
  featureFlags: TenantFeatureFlagsRecord | null;
  ownerEmail: string;
  adminUrl: string;
  publicWebsiteUrl: string;
  inviteUrl?: string | null;
  temporaryPassword?: string | null;
}) {
  const nextSteps = [
    `Open owner portal at ${adminUrl}.`,
    "Update homepage content, upload logo, and confirm brand colors.",
    "Add menu items into seeded categories and review live storefront.",
    `Verify collection ${setup.collectionEnabled ? "enabled" : "disabled"} and delivery ${setup.deliveryEnabled ? "enabled" : "disabled"} defaults.`,
    featureFlags?.printerIntegration
      ? "Register printer agent against seeded kitchen station before live trading."
      : "Enable printer integration later if kitchen ticket printing becomes required.",
    setup.customDomain
      ? `Verify and connect custom domain placeholder ${setup.customDomain}.`
      : "Keep subdomain live or add custom domain later from tenant detail."
  ];

  return (
    <section className="stack-xl">
      <article className="panel platform-success-hero">
        <p className="eyebrow">Provisioning complete</p>
        <h2>{restaurant.tenant.name} ready for setup handoff</h2>
        <p>Tenant, owner account, defaults, website shell, menu categories, print config, feature flags, and audit trail created.</p>
      </article>

      <section className="platform-summary-grid">
        <article className="platform-summary-card">
          <span className="eyebrow">Restaurant admin URL</span>
          <strong>
            <a href={adminUrl} target="_blank" rel="noreferrer">
              {adminUrl}
            </a>
          </strong>
          <p>Owner portal entrypoint.</p>
        </article>
        <article className="platform-summary-card">
          <span className="eyebrow">Public website URL</span>
          <strong>
            <a href={publicWebsiteUrl} target="_blank" rel="noreferrer">
              {publicWebsiteUrl}
            </a>
          </strong>
          <p>Primary launch URL.</p>
        </article>
        <article className="platform-summary-card">
          <span className="eyebrow">Owner login email</span>
          <strong>{ownerEmail}</strong>
          <p>Provisioned restaurant owner identity.</p>
        </article>
        <article className="platform-summary-card">
          <span className="eyebrow">Primary domain</span>
          <strong>{restaurant.domains.find((domain) => domain.isPrimary)?.domain ?? restaurant.domains[0]?.domain ?? "Pending"}</strong>
          <p>Tenant host mapping.</p>
        </article>
      </section>

      <section className="content-grid platform-detail-grid">
        <article className="panel">
          <h2>Access handoff</h2>
          <div className="platform-detail-list">
            <SetupRow label="Owner email" value={ownerEmail} />
            <SetupRow label="Admin URL" value={adminUrl} />
            {temporaryPassword ? <SetupRow label="Temporary password" value={temporaryPassword} /> : null}
            {inviteUrl ? <SetupRow label="Invite link" value={inviteUrl} /> : null}
          </div>
        </article>

        <article className="panel">
          <h2>Provisioned defaults</h2>
          <div className="platform-detail-list">
            <SetupRow label="Business type" value={setup.businessType} />
            <SetupRow label="Theme preset" value={setup.themePreset} />
            <SetupRow label="Currency" value={setup.defaultCurrency} />
            <SetupRow label="Timezone" value={setup.timezone} />
            <SetupRow label="Subdomain" value={setup.subdomain} />
            <SetupRow label="Custom domain placeholder" value={setup.customDomain ?? "Not provided"} />
          </div>
        </article>
      </section>

      <section className="content-grid platform-detail-grid">
        <article className="panel">
          <h2>Ordering defaults</h2>
          <div className="platform-detail-list">
            <SetupRow label="Collection" value={setup.collectionEnabled ? "Enabled" : "Disabled"} />
            <SetupRow label="Delivery" value={setup.deliveryEnabled ? "Enabled" : "Disabled"} />
            <SetupRow label="Collection time" value={`${setup.defaultCollectionTimeMinutes} min`} />
            <SetupRow label="Delivery time" value={`${setup.defaultDeliveryTimeMinutes} min`} />
            <SetupRow label="Delivery radius" value={`${setup.deliveryRadiusMiles} miles`} />
            <SetupRow label="Minimum order" value={`${setup.defaultCurrency} ${setup.minimumOrderAmount.toFixed(2)}`} />
            <SetupRow label="Delivery fee" value={`${setup.defaultCurrency} ${setup.deliveryFee.toFixed(2)}`} />
          </div>
        </article>

        <article className="panel">
          <h2>Feature flags</h2>
          <div className="platform-feature-grid">
            {([
              ["Online ordering", featureFlags?.onlineOrdering],
              ["Cash payment", featureFlags?.cashPayment],
              ["Card payment", featureFlags?.cardPayment],
              ["Customer login", featureFlags?.customerLogin],
              ["Table booking", featureFlags?.tableBooking],
              ["Reviews", featureFlags?.reviews],
              ["Printer integration", featureFlags?.printerIntegration],
              ["Driver module", featureFlags?.driverModule]
            ] as [string, boolean | undefined][]).map(([label, enabled]) => (
              <article key={label} className="platform-feature-card is-static">
                <div>
                  <strong>{label}</strong>
                  <span>{enabled ? "Enabled" : "Disabled"}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <article className="panel">
        <h2>Next setup steps</h2>
        <ol className="platform-next-steps">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>
    </section>
  );
}

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label="Order">{order.orderNumber}</td>
              <td data-label="Customer">{order.customerName}</td>
              <td data-label="Status">{order.orderStatus}</td>
              <td data-label="Payment">{order.paymentStatus}</td>
              <td data-label="Total">{formatMoney(order.total)}</td>
              <td data-label="Created">{formatDate(order.createdAt)}</td>
            </tr>
          ))}
          {!orders.length ? (
            <tr>
              <td colSpan={6}>No orders yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function PrintStationsTable({ stations }: { stations: PrintStation[] }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Station</th>
            <th>Enabled</th>
            <th>Printer</th>
            <th>Last seen</th>
            <th>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => (
            <tr key={station.id}>
              <td data-label="Station">{station.name}</td>
              <td data-label="Enabled">{station.enabled ? "Yes" : "No"}</td>
              <td data-label="Printer">{station.printerName || "Not assigned"}</td>
              <td data-label="Last seen">{formatDate(station.lastSeenAt)}</td>
              <td data-label="Last activity">{station.lastActivityMessage || "No activity"}</td>
            </tr>
          ))}
          {!stations.length ? (
            <tr>
              <td colSpan={5}>No print stations connected yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function PlatformTenantDetailView({
  restaurant,
  status,
  message
}: {
  restaurant: PlatformTenantDetail;
  status?: string;
  message?: string;
}) {
  const primaryDomain =
    restaurant.domains.find((domain) => domain.isPrimary)?.domain ??
    restaurant.domains[0]?.domain ??
    "Not configured";

  return (
    <section className="stack-xl">
      <FlashMessage status={status} message={message} />

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Restaurant detail</p>
            <h2>{restaurant.tenant.name}</h2>
            <p>{restaurant.tenant.id}</p>
          </div>
          <div className="actions">
            <a href={restaurant.adminLoginPath} className="button-ghost compact-button">
              Open admin login
            </a>
            <Link href="/platform/tenants" className="button-ghost compact-button">
              Back to directory
            </Link>
          </div>
        </div>
        <div className="platform-summary-grid">
          <article className="platform-summary-card">
            <span className="eyebrow">Status</span>
            <strong>{restaurant.tenant.status}</strong>
            <p>Primary domain: {primaryDomain}</p>
          </article>
          <article className="platform-summary-card">
            <span className="eyebrow">Subscription</span>
            <strong>{restaurant.subscription?.planCode ?? "Not set"}</strong>
            <p>{restaurant.subscription?.status ?? "No active subscription record"}</p>
          </article>
          <article className="platform-summary-card">
            <span className="eyebrow">Orders</span>
            <strong>{restaurant.orderSummary.totalOrders}</strong>
            <p>{formatMoney(restaurant.orderSummary.grossRevenue)} paid revenue</p>
          </article>
          <article className="platform-summary-card">
            <span className="eyebrow">Printing</span>
            <strong>{restaurant.printerSummary.status.replaceAll("_", " ")}</strong>
            <p>{restaurant.printerSummary.onlineStations}/{restaurant.printerSummary.totalStations} online</p>
          </article>
        </div>
      </article>

      <section className="content-grid platform-detail-grid">
        <article className="panel">
          <h2>Basic info</h2>
          <form className="form-grid platform-form-grid" action={`/api/v1/platform/tenants/${restaurant.tenant.id}`} method="post">
            <input type="hidden" name="intent" value="update_basic" />
            <label className="platform-field">
              <span>Name</span>
              <input name="name" defaultValue={restaurant.tenant.name} required />
            </label>
            <label className="platform-field">
              <span>Legal name</span>
              <input name="legalName" defaultValue={restaurant.tenant.legalName ?? restaurant.tenant.name} />
            </label>
            <label className="platform-field">
              <span>Support email</span>
              <input name="supportEmail" type="email" defaultValue={restaurant.tenant.supportEmail ?? ""} required />
            </label>
            <label className="platform-field">
              <span>Support phone</span>
              <input name="supportPhone" defaultValue={restaurant.tenant.supportPhone ?? ""} />
            </label>
            <label className="platform-field">
              <span>Cuisine</span>
              <input name="cuisine" defaultValue={restaurant.settings.cuisine ?? ""} />
            </label>
            <label className="platform-field">
              <span>Timezone</span>
              <input name="timezone" defaultValue={restaurant.tenant.timezone} />
            </label>
            <label className="platform-field platform-field-full">
              <span>Address</span>
              <input name="address" defaultValue={restaurant.settings.addressLine1 ?? ""} />
            </label>
            <button type="submit" className="button-primary">Save basic info</button>
          </form>
        </article>

        <article className="panel">
          <h2>Status and plan</h2>
          <form className="form-grid platform-form-grid" action={`/api/v1/platform/tenants/${restaurant.tenant.id}`} method="post">
            <input type="hidden" name="intent" value="update_status" />
            <label className="platform-field">
              <span>Restaurant status</span>
              <select name="status" defaultValue={restaurant.tenant.status}>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button type="submit" className="button-primary">Update status</button>
          </form>

          <form className="form-grid platform-form-grid" action={`/api/v1/platform/tenants/${restaurant.tenant.id}`} method="post">
            <input type="hidden" name="intent" value="update_subscription" />
            <label className="platform-field">
              <span>Plan</span>
              <select name="planCode" defaultValue={restaurant.subscription?.planCode ?? "starter"}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="platform-field">
              <span>Subscription status</span>
              <select name="subscriptionStatus" defaultValue={restaurant.subscription?.status ?? "trialing"}>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="platform-field">
              <span>Billing interval</span>
              <select name="billingInterval" defaultValue={restaurant.subscription?.billingInterval ?? "monthly"}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <button type="submit" className="button-primary">Save subscription</button>
          </form>
        </article>
      </section>

      <section className="content-grid platform-detail-grid">
        <article className="panel">
          <h2>Domains and launch</h2>
          <form className="form-grid platform-form-grid" action={`/api/v1/platform/tenants/${restaurant.tenant.id}`} method="post">
            <input type="hidden" name="intent" value="update_domains" />
            <label className="platform-field">
              <span>Subdomain</span>
              <input
                name="subdomain"
                defaultValue={
                  restaurant.domains.find((domain) => domain.domainType === "subdomain")?.domain.split(".")[0] ??
                  restaurant.tenant.slug
                }
              />
            </label>
            <label className="platform-field">
              <span>Custom domain</span>
              <input
                name="customDomain"
                defaultValue={restaurant.domains.find((domain) => domain.domainType === "custom")?.domain ?? ""}
                placeholder="orders.example.com"
              />
            </label>
            <label className="platform-checkbox">
              <input
                type="checkbox"
                name="customDomainVerified"
                value="true"
                defaultChecked={restaurant.domains.find((domain) => domain.domainType === "custom")?.verificationStatus === "verified"}
              />
              <span>Custom domain is verified and ready for traffic</span>
            </label>
            <button type="submit" className="button-primary">Save domain settings</button>
          </form>
          <ul className="plain-list platform-domain-list">
            {restaurant.domains.map((domain) => (
              <li key={domain.id}>
                <strong>{domain.domain}</strong>
                <span>
                  {domain.isPrimary ? "Primary | " : ""}{domain.domainType} | {domain.verificationStatus} | {domain.sslStatus ?? "n/a"}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Enabled features</h2>
          <form className="form-grid platform-form-grid" action={`/api/v1/platform/tenants/${restaurant.tenant.id}`} method="post">
            <input type="hidden" name="intent" value="update_features" />
            <div className="platform-feature-grid">
              {Object.entries(FEATURE_LABELS).map(([featureKey, feature]) => (
                <label key={featureKey} className="platform-feature-card">
                  <input
                    type="checkbox"
                    name="features"
                    value={featureKey}
                    defaultChecked={restaurant.features.includes(featureKey as PlatformFeatureKey)}
                  />
                  <div>
                    <strong>{feature.title}</strong>
                    <span>{feature.description}</span>
                  </div>
                </label>
              ))}
            </div>
            <button type="submit" className="button-primary">Save features</button>
          </form>
        </article>
      </section>

      <section className="content-grid platform-detail-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Orders</p>
              <h2>Recent order summary</h2>
              <p>Latest operational activity for this restaurant.</p>
            </div>
          </div>
          <OrdersTable orders={restaurant.recentOrders} />
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Printing</p>
              <h2>Printer connection status</h2>
              <p>Heartbeat and station visibility for kitchen printing.</p>
            </div>
          </div>
          <PrintStationsTable stations={restaurant.printStations} />
        </article>
      </section>
    </section>
  );
}
