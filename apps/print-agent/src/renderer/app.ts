import type { AgentJobSummary, AgentState } from "../shared/types";
import { startAlertSound, stopAlertSound } from "./alert-sound";

declare global {
  interface Window {
    printAgent: {
      getState(): Promise<AgentState>;
      updateConfig(patch: Partial<AgentState["config"]>): Promise<AgentState["config"]>;
      refreshPrinters(): Promise<string[]>;
      registerStation(): Promise<unknown>;
      refreshNow(): Promise<void>;
      testPrint(): Promise<void>;
      printJob(jobId: string): Promise<void>;
      subscribeState(listener: (state: AgentState) => void): () => void;
      onNewOrder(listener: (job: AgentJobSummary) => void): () => void;
      onPrintSucceeded(listener: () => void): () => void;
      onPrintFailed(listener: (job: AgentJobSummary) => void): () => void;
      acknowledgeOrder(jobId: string): Promise<void>;
      saveAsPdf(jobId: string): Promise<void>;
    };
  }
}

type AppView = "dashboard" | "orders" | "settings" | "previous";
type DashboardSection = "queue" | "activity";
type OrderFilterStatus = "all" | "pending" | "accepted" | "cancelled" | "completed";
type OrderFilterType = "all" | "delivery" | "collection";
type OrderViewStatus = Exclude<OrderFilterStatus, "all">;

interface OrderRecord extends AgentJobSummary {
  normalizedStatus: OrderViewStatus;
  sortTime: number;
  printJobId?: string;
}

const appRoot = document.getElementById("app");

if (!appRoot) {
  throw new Error("App root not found.");
}

const root = appRoot;
let latestState: AgentState | null = null;
let lastRenderKey = "";

function getRenderKey(state: AgentState): string {
  return JSON.stringify({
    v: uiState.view,
    ads: uiState.activeDashboardSection,
    oid: uiState.selectedOrderId,
    aj: uiState.alertJob?.id,
    s: state.status,
    cs: state.connectionState,
    q: state.queue.map((j) => `${j.id}:${j.status}`).join(","),
    h: state.history.length,
    li: state.logs.slice(0, 2).map((l) => l.id).join(","),
    le: state.lastError,
    ap: state.config.autoPrintEnabled,
    pr: state.config.selectedPrinter
  });
}

const uiState: {
  view: AppView;
  activeDashboardSection: DashboardSection;
  pendingScrollTarget: DashboardSection | null;
  selectedOrderId?: string;
  alertJob?: AgentJobSummary;
  filters: {
    search: string;
    status: OrderFilterStatus;
    orderType: OrderFilterType;
    dateFrom: string;
    dateTo: string;
  };
} = {
  view: "dashboard",
  activeDashboardSection: "queue",
  pendingScrollTarget: "queue",
  filters: {
    search: "",
    status: "all",
    orderType: "all",
    dateFrom: "",
    dateTo: ""
  }
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function toLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function maskToken(token: string) {
  if (!token) {
    return "Not paired";
  }

  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function getBadgeClass(status: string) {
  if (status === "printed" || status === "ready" || status === "online") {
    return "success";
  }

  if (status === "failed" || status === "error" || status === "offline") {
    return "danger";
  }

  return "warning";
}

function getMetricTone(status: string) {
  if (status === "online" || status === "printed" || status === "ready") {
    return "orange";
  }

  if (status === "failed" || status === "offline" || status === "error") {
    return "forest";
  }

  return "gold";
}

function normalizeOrderStatus(orderStatus: string): OrderViewStatus {
  if (orderStatus === "accepted") {
    return "accepted";
  }

  if (orderStatus === "completed") {
    return "completed";
  }

  if (["cancelled", "refunded", "rejected"].includes(orderStatus)) {
    return "cancelled";
  }

  return "pending";
}

function getOrderBadgeClass(status: OrderViewStatus) {
  return status;
}

function getOrderSortTime(job: AgentJobSummary) {
  return Date.parse(job.printedAt ?? job.claimedAt ?? job.createdAt) || 0;
}

function getSectionId(section: DashboardSection) {
  return `dashboard-${section}`;
}

function getSystemInfo() {
  return {
    platform: typeof navigator !== "undefined" ? navigator.platform || "Unknown platform" : "Unknown platform",
    language: typeof navigator !== "undefined" ? navigator.language || "Unknown language" : "Unknown language",
    online: typeof navigator !== "undefined" ? (navigator.onLine ? "Online" : "Offline") : "Unknown",
    concurrency:
      typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
        ? `${navigator.hardwareConcurrency} logical cores`
        : "Unavailable",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unavailable",
    timeZone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone"
        : "Unknown timezone"
  };
}

function deriveOrders(state: AgentState) {
  const queuedJobsByOrderId = new Map(state.queue.map((job) => [job.orderId, job.id] as const));
  const latestByOrderId = new Map<string, OrderRecord>();

  for (const job of [...state.history, ...state.queue]) {
    const nextRecord: OrderRecord = {
      ...job,
      normalizedStatus: normalizeOrderStatus(job.orderStatus),
      sortTime: getOrderSortTime(job),
      printJobId: queuedJobsByOrderId.get(job.orderId)
    };
    const currentRecord = latestByOrderId.get(job.orderId);

    if (!currentRecord || nextRecord.sortTime >= currentRecord.sortTime) {
      latestByOrderId.set(job.orderId, nextRecord);
    }
  }

  return Array.from(latestByOrderId.values()).sort((left, right) => right.sortTime - left.sortTime);
}

function hasActiveFilters() {
  return Boolean(
    uiState.filters.search ||
      uiState.filters.status !== "all" ||
      uiState.filters.orderType !== "all" ||
      uiState.filters.dateFrom ||
      uiState.filters.dateTo
  );
}

function filterOrders(orders: OrderRecord[]) {
  const search = uiState.filters.search.trim().toLowerCase();
  const fromTime = uiState.filters.dateFrom ? Date.parse(`${uiState.filters.dateFrom}T00:00:00`) : null;
  const toTime = uiState.filters.dateTo ? Date.parse(`${uiState.filters.dateTo}T23:59:59.999`) : null;

  return orders.filter((order) => {
    if (search) {
      const haystack = [order.orderNumber, order.orderId, order.customerName, order.customerPhone, "email unavailable"]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (uiState.filters.status !== "all" && order.normalizedStatus !== uiState.filters.status) {
      return false;
    }

    if (uiState.filters.orderType !== "all" && order.fulfillmentType !== uiState.filters.orderType) {
      return false;
    }

    if (fromTime && order.sortTime < fromTime) {
      return false;
    }

    if (toTime && order.sortTime > toTime) {
      return false;
    }

    return true;
  });
}

function isWithinLastDays(value: string, days: number) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function renderSidebarLink(
  label: string,
  detail: string,
  options: {
    active: boolean;
    section?: DashboardSection;
    view?: AppView;
  }
) {
  const attributes = options.section
    ? `data-nav-dashboard="${options.section}"`
    : options.view
      ? `data-nav-view="${options.view}"`
      : "";

  return `
    <button type="button" class="admin-sidebar-link ${options.active ? "active" : ""}" ${attributes}>
      <span class="admin-sidebar-icon">${escapeHtml(label.slice(0, 1))}</span>
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    </button>
  `;
}

function renderMetricCard(label: string, value: string, detail: string, tone: "orange" | "gold" | "forest") {
  return `
    <article class="admin-metric-card tone-${tone}">
      <div class="admin-metric-icon">${escapeHtml(label.slice(0, 1))}</div>
      <div class="admin-metric-copy">
        <p>${escapeHtml(label)}</p>
        <h3>${escapeHtml(value)}</h3>
        <span>${escapeHtml(detail)}</span>
      </div>
    </article>
  `;
}

function renderBreakdownRow(label: string, value: string) {
  return `
    <div class="admin-breakdown-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function renderQueueJob(job: AgentJobSummary) {
  return `
    <article class="admin-job-card">
      <div class="admin-card-topline">
        <div>
          <p class="eyebrow">${escapeHtml(toLabel(job.triggerType))} | ${escapeHtml(toLabel(job.copyType))}</p>
          <h3>${escapeHtml(job.orderNumber)}</h3>
          <p>${formatDate(job.createdAt)} | ${escapeHtml(toLabel(job.fulfillmentType))} | ${escapeHtml(toLabel(job.paymentStatus))}</p>
        </div>
        <span class="admin-badge ${getBadgeClass(job.status)}">${escapeHtml(toLabel(job.status))}</span>
      </div>

      <div class="admin-order-meta-grid">
        <div>
          <strong>Customer</strong>
          <span>${escapeHtml(job.customerName)}</span>
        </div>
        <div>
          <strong>Phone</strong>
          <span>${escapeHtml(job.customerPhone || "N/A")}</span>
        </div>
        <div>
          <strong>Destination</strong>
          <span>${escapeHtml(job.address || "Collection counter")}</span>
        </div>
        <div>
          <strong>Attempts</strong>
          <span>${job.attemptCount} tries | Print #${job.printCount}</span>
        </div>
      </div>

      <div class="admin-breakdown-list compact">
        ${renderBreakdownRow("Order state", toLabel(job.orderStatus))}
        ${renderBreakdownRow("Claimed", formatDate(job.claimedAt))}
        ${renderBreakdownRow("Ticket total", formatMoney(job.total))}
      </div>

      <ul class="admin-item-list">
        ${job.items
          .map(
            (item) =>
              `<li><strong>${item.quantity} x ${escapeHtml(item.name)}</strong>${item.note ? `<span>${escapeHtml(item.note)}</span>` : "<span>No note</span>"}</li>`
          )
          .join("")}
      </ul>

      ${job.lastError ? `<div class="admin-inline-alert danger"><strong>Last error</strong><span>${escapeHtml(job.lastError)}</span></div>` : ""}

      <div class="admin-card-actions">
        <button class="button-ghost compact-button" data-action="print-job" data-job-id="${job.id}">Print / Retry</button>
      </div>
    </article>
  `;
}

function renderHistoryJob(job: AgentJobSummary) {
  return `
    <article class="admin-history-card">
      <div class="admin-card-topline">
        <div>
          <h3>${escapeHtml(job.orderNumber)}</h3>
          <p>${formatDate(job.printedAt || job.createdAt)} | ${escapeHtml(job.customerName)}</p>
        </div>
        <span class="admin-badge ${getBadgeClass(job.status)}">${escapeHtml(toLabel(job.status))}</span>
      </div>
      <div class="admin-breakdown-list compact">
        ${renderBreakdownRow("Trigger", toLabel(job.triggerType))}
        ${renderBreakdownRow("Total", formatMoney(job.total))}
        ${renderBreakdownRow("Copies", `${job.printCount} printed`)}
      </div>
      ${job.lastError ? `<div class="admin-inline-alert danger"><strong>Last error</strong><span>${escapeHtml(job.lastError)}</span></div>` : ""}
    </article>
  `;
}

function renderLog(log: AgentState["logs"][number]) {
  const badgeClass = log.level === "error" ? "danger" : "success";

  return `
    <article class="admin-timeline-item">
      <div class="admin-card-topline">
        <div>
          <h3>${escapeHtml(log.message)}</h3>
          <p>${formatDate(log.createdAt)}${log.orderNumber ? ` | ${escapeHtml(log.orderNumber)}` : ""}</p>
        </div>
        <span class="admin-badge ${badgeClass}">${escapeHtml(log.level)}</span>
      </div>
    </article>
  `;
}

function renderOrderAlertPopup(job: AgentJobSummary) {
  const items = job.items
    .map((item) => `<li><strong>${item.quantity} x ${escapeHtml(item.name)}</strong></li>`)
    .join("");

  return `
    <div class="admin-alert-overlay">
      <div class="admin-alert-popup">
        <div class="admin-alert-indicator">
          <span class="admin-alert-dot" aria-hidden="true"></span>
          <span>New order received</span>
        </div>
        <div class="admin-alert-body">
          <h2 class="admin-alert-title">${escapeHtml(job.orderNumber)}</h2>
          <div class="admin-alert-meta">
            <div class="admin-alert-meta-row">
              <span>Customer</span>
              <strong>${escapeHtml(job.customerName)}</strong>
            </div>
            <div class="admin-alert-meta-row">
              <span>Type</span>
              <strong>${escapeHtml(toLabel(job.fulfillmentType))}</strong>
            </div>
            <div class="admin-alert-meta-row">
              <span>Total</span>
              <strong>${formatMoney(job.total)}</strong>
            </div>
            <div class="admin-alert-meta-row">
              <span>Time</span>
              <strong>${formatDate(job.createdAt)}</strong>
            </div>
          </div>
          <div class="admin-alert-items">
            <p class="eyebrow">Items</p>
            <ul>${items}</ul>
          </div>
        </div>
        <div class="admin-alert-actions">
          <button type="button" class="button-primary admin-alert-btn" data-action="acknowledge-alert" data-job-id="${job.id}">
            Receive Order
          </button>
          <button type="button" class="button-ghost admin-alert-btn" data-action="save-pdf-alert" data-job-id="${job.id}">
            Save as PDF
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderOrderStats(orders: OrderRecord[]) {
  const acceptedLast7 = orders.filter((order) => order.normalizedStatus === "accepted" && isWithinLastDays(order.createdAt, 7)).length;
  const acceptedLifetime = orders.filter((order) => order.normalizedStatus === "accepted").length;
  const cancelledLast7 = orders.filter((order) => order.normalizedStatus === "cancelled" && isWithinLastDays(order.createdAt, 7)).length;
  const cancelledLifetime = orders.filter((order) => order.normalizedStatus === "cancelled").length;
  const pendingCount = orders.filter((order) => order.normalizedStatus === "pending").length;

  return `
    <section class="admin-orders-stats-grid">
      ${renderMetricCard("Accepted 7d", String(acceptedLast7), "Accepted in the last 7 days", acceptedLast7 ? "orange" : "gold")}
      ${renderMetricCard("Accepted all", String(acceptedLifetime), "Lifetime accepted orders", acceptedLifetime ? "orange" : "gold")}
      ${renderMetricCard("Cancelled 7d", String(cancelledLast7), "Cancelled in the last 7 days", cancelledLast7 ? "forest" : "gold")}
      ${renderMetricCard("Cancelled all", String(cancelledLifetime), "Lifetime cancelled orders", cancelledLifetime ? "forest" : "gold")}
      ${renderMetricCard("Pending", String(pendingCount), "Pending order count", pendingCount ? "gold" : "orange")}
      ${renderMetricCard("Total", String(orders.length), "All orders available in agent history", orders.length ? "orange" : "gold")}
    </section>
  `;
}

function renderOrderDetails(order: OrderRecord) {
  return `
    <article class="admin-surface-card">
      <div class="admin-section-header">
        <div>
          <p class="eyebrow">Order detail</p>
          <h2>${escapeHtml(order.orderNumber)}</h2>
          <p>${formatDate(order.printedAt || order.createdAt)} | ${escapeHtml(order.customerName)} | ${escapeHtml(toLabel(order.fulfillmentType))}</p>
        </div>
        <div class="admin-section-actions">
          <span class="admin-badge ${getOrderBadgeClass(order.normalizedStatus)}">${escapeHtml(toLabel(order.normalizedStatus))}</span>
        </div>
      </div>
      <div class="admin-order-detail-grid">
        <div class="admin-detail-card">
          <strong>Customer</strong>
          <span>${escapeHtml(order.customerName)}</span>
          <span>${escapeHtml(order.customerPhone || "No phone recorded")}</span>
          <span>Email unavailable in print-agent feed</span>
        </div>
        <div class="admin-detail-card">
          <strong>Routing</strong>
          <span>${escapeHtml(toLabel(order.fulfillmentType))}</span>
          <span>${escapeHtml(order.address || "Collection counter")}</span>
          <span>${formatMoney(order.total)}</span>
        </div>
        <div class="admin-detail-card">
          <strong>Print state</strong>
          <span>${escapeHtml(toLabel(order.status))}</span>
          <span>${order.attemptCount} attempts</span>
          <span>${order.printCount} copies</span>
        </div>
      </div>
      <ul class="admin-item-list">
        ${order.items
          .map(
            (item) =>
              `<li><strong>${item.quantity} x ${escapeHtml(item.name)}</strong>${item.note ? `<span>${escapeHtml(item.note)}</span>` : "<span>No note</span>"}</li>`
          )
          .join("")}
      </ul>
      ${order.lastError ? `<div class="admin-inline-alert danger"><strong>Last error</strong><span>${escapeHtml(order.lastError)}</span></div>` : ""}
    </article>
  `;
}

function renderOrdersTableRows(orders: OrderRecord[]) {
  return orders
    .map((order) => `
      <tr>
        <td data-label="Order ID"><strong>${escapeHtml(order.orderNumber)}</strong><span class="admin-table-subcopy">${escapeHtml(order.orderId)}</span></td>
        <td data-label="Customer">${escapeHtml(order.customerName)}</td>
        <td data-label="Contact">${escapeHtml(order.customerPhone || "No phone")}<span class="admin-table-subcopy">Email unavailable</span></td>
        <td data-label="Status"><span class="admin-badge ${getOrderBadgeClass(order.normalizedStatus)}">${escapeHtml(toLabel(order.normalizedStatus))}</span></td>
        <td data-label="Type">${escapeHtml(toLabel(order.fulfillmentType))}</td>
        <td data-label="Total">${formatMoney(order.total)}</td>
        <td data-label="Date">${formatDate(order.printedAt || order.createdAt)}</td>
        <td data-label="Actions">
          <div class="admin-inline-actions">
            <button type="button" class="button-ghost compact-button" data-action="toggle-order-details" data-order-id="${order.orderId}">
              View details
            </button>
            ${
              order.printJobId
                ? `<button type="button" class="button-ghost compact-button" data-action="reprint-order" data-job-id="${order.printJobId}">Reprint</button>`
                : `<button type="button" class="button-ghost compact-button is-disabled" disabled>Reprint unavailable</button>`
            }
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderOrdersCards(orders: OrderRecord[]) {
  return orders
    .map(
      (order) => `
        <article class="admin-order-card-mobile">
          <div class="admin-card-topline">
            <div>
              <p class="eyebrow">${escapeHtml(toLabel(order.fulfillmentType))}</p>
              <h3>${escapeHtml(order.orderNumber)}</h3>
              <p>${formatDate(order.printedAt || order.createdAt)}</p>
            </div>
            <span class="admin-badge ${getOrderBadgeClass(order.normalizedStatus)}">${escapeHtml(toLabel(order.normalizedStatus))}</span>
          </div>
          <div class="admin-breakdown-list compact">
            ${renderBreakdownRow("Customer", order.customerName)}
            ${renderBreakdownRow("Total", formatMoney(order.total))}
          </div>
          <div class="admin-inline-actions">
            <button type="button" class="button-ghost compact-button" data-action="toggle-order-details" data-order-id="${order.orderId}">
              View details
            </button>
            ${
              order.printJobId
                ? `<button type="button" class="button-ghost compact-button" data-action="reprint-order" data-job-id="${order.printJobId}">Reprint</button>`
                : `<button type="button" class="button-ghost compact-button is-disabled" disabled>Reprint unavailable</button>`
            }
          </div>
        </article>
      `
    )
    .join("");
}

function renderOrdersView(state: AgentState, allOrders: OrderRecord[]) {
  const visibleOrders = filterOrders(allOrders);
  const statsOrders = hasActiveFilters() ? visibleOrders : allOrders;

  return `
    <section class="admin-orders-page">
      ${renderOrderStats(statsOrders)}

      <section class="admin-surface-card">
        <div class="admin-section-header">
          <div>
            <p class="eyebrow">Filters</p>
            <h2>Search and narrow orders</h2>
            <p>Find orders by order number, customer, phone, status, date, or fulfilment type.</p>
          </div>
          <div class="admin-section-actions">
            <span class="admin-badge warning">${visibleOrders.length} visible</span>
          </div>
        </div>

        <form id="orders-filters-form" class="admin-orders-filter-grid">
          <label class="admin-filter-field admin-filter-field-search">
            <p class="eyebrow">Search</p>
            <input
              name="search"
              value="${escapeHtml(uiState.filters.search)}"
              placeholder="Order ID, customer, phone, email"
            />
          </label>
          <label class="admin-filter-field">
            <p class="eyebrow">Status</p>
            <select name="status">
              <option value="all" ${uiState.filters.status === "all" ? "selected" : ""}>All statuses</option>
              <option value="pending" ${uiState.filters.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="accepted" ${uiState.filters.status === "accepted" ? "selected" : ""}>Accepted</option>
              <option value="cancelled" ${uiState.filters.status === "cancelled" ? "selected" : ""}>Cancelled</option>
              <option value="completed" ${uiState.filters.status === "completed" ? "selected" : ""}>Completed</option>
            </select>
          </label>
          <label class="admin-filter-field">
            <p class="eyebrow">Order type</p>
            <select name="orderType">
              <option value="all" ${uiState.filters.orderType === "all" ? "selected" : ""}>All types</option>
              <option value="delivery" ${uiState.filters.orderType === "delivery" ? "selected" : ""}>Delivery</option>
              <option value="collection" ${uiState.filters.orderType === "collection" ? "selected" : ""}>Collection</option>
            </select>
          </label>
          <label class="admin-filter-field">
            <p class="eyebrow">From date</p>
            <input type="date" name="dateFrom" value="${escapeHtml(uiState.filters.dateFrom)}" />
          </label>
          <label class="admin-filter-field">
            <p class="eyebrow">To date</p>
            <input type="date" name="dateTo" value="${escapeHtml(uiState.filters.dateTo)}" />
          </label>
          <div class="admin-filter-actions">
            <button type="submit" class="button-primary admin-submit-button">Apply filters</button>
            <button type="button" class="button-ghost compact-button" data-action="clear-order-filters">Clear</button>
          </div>
        </form>
      </section>

      <section class="admin-surface-card admin-table-card">
        <div class="admin-section-header">
          <div>
            <p class="eyebrow">Orders</p>
            <h2>All available order history</h2>
            <p>Responsive owner-friendly order log sourced from current queue and saved print history.</p>
          </div>
          <div class="admin-section-actions">
            <span class="admin-badge success">${allOrders.length} total</span>
          </div>
        </div>

        ${
          visibleOrders.length
            ? `
              <div class="admin-orders-table-wrap">
                <table class="admin-orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderOrdersTableRows(visibleOrders)}
                  </tbody>
                </table>
              </div>
              <div class="admin-orders-card-list">
                ${renderOrdersCards(visibleOrders)}
              </div>
            `
            : `<div class="admin-empty-card">No orders match the current filters.</div>`
        }
      </section>
    </section>
  `;
}

function renderSettingsView(state: AgentState) {
  const stationSummary = state.stationId ? `${state.config.stationName} linked` : "Station not paired";
  const printerSummary = state.config.selectedPrinter || "No printer selected";

  return `
    <section class="admin-page-layout">
      <main class="admin-page-main">
        <section class="admin-surface-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Settings</p>
              <h2>Desktop and hardware configuration</h2>
              <p>Keep desktop behaviour, connection details, and printer hardware in one clean settings workspace.</p>
            </div>
            <div class="admin-section-actions">
              <span class="admin-badge ${getBadgeClass(state.connectionState)}">${escapeHtml(toLabel(state.connectionState))}</span>
            </div>
          </div>

          <form id="settings-form" class="admin-form-stack">
            <section class="admin-settings-group">
              <div class="admin-settings-heading">
                <p class="eyebrow">Desktop</p>
                <h3>Desktop behaviour</h3>
                <p>Control how this Windows workstation behaves during service.</p>
              </div>
              <div class="admin-field-grid">
                <label>
                  <p class="eyebrow">Station name</p>
                  <input name="stationName" value="${escapeHtml(state.config.stationName)}" />
                </label>
                <label>
                  <p class="eyebrow">Device ID</p>
                  <input name="deviceId" value="${escapeHtml(state.config.deviceId)}" />
                </label>
                <label>
                  <p class="eyebrow">Auto print</p>
                  <select name="autoPrintEnabled">
                    <option value="true" ${state.config.autoPrintEnabled ? "selected" : ""}>Enabled</option>
                    <option value="false" ${!state.config.autoPrintEnabled ? "selected" : ""}>Disabled</option>
                  </select>
                </label>
                <label>
                  <p class="eyebrow">Launch on startup</p>
                  <select name="launchOnStartup">
                    <option value="true" ${state.config.launchOnStartup ? "selected" : ""}>Enabled</option>
                    <option value="false" ${!state.config.launchOnStartup ? "selected" : ""}>Disabled</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="admin-settings-group">
              <div class="admin-settings-heading">
                <p class="eyebrow">Connection</p>
                <h3>Service connection</h3>
                <p>Link the desktop app to the correct tenant and pairing identity.</p>
              </div>
              <div class="admin-field-grid">
                <label>
                  <p class="eyebrow">Server URL</p>
                  <input name="serverUrl" value="${escapeHtml(state.config.serverUrl)}" />
                </label>
                <label>
                  <p class="eyebrow">Tenant ID</p>
                  <input name="tenantId" value="${escapeHtml(state.config.tenantId)}" />
                </label>
                <label>
                  <p class="eyebrow">Registration key</p>
                  <input name="registrationKey" value="${escapeHtml(state.config.registrationKey)}" />
                </label>
                <label class="admin-field-span-2">
                  <p class="eyebrow">Station token</p>
                  <input name="stationToken" value="${escapeHtml(state.config.stationToken)}" />
                </label>
              </div>
            </section>

            <section class="admin-settings-group">
              <div class="admin-settings-heading">
                <p class="eyebrow">Hardware</p>
                <h3>Printer routing</h3>
                <p>Choose the target Windows printer and paper width for this station.</p>
              </div>
              <div class="admin-field-grid">
                <label>
                  <p class="eyebrow">Windows printer</p>
                  <select name="selectedPrinter">
                    <option value="">Select printer</option>
                    ${state.printers
                      .map(
                        (printer) =>
                          `<option value="${escapeHtml(printer)}" ${printer === state.config.selectedPrinter ? "selected" : ""}>${escapeHtml(printer)}</option>`
                      )
                      .join("")}
                  </select>
                </label>
                <label>
                  <p class="eyebrow">Paper width</p>
                  <select name="paperWidth">
                    <option value="58mm" ${state.config.paperWidth === "58mm" ? "selected" : ""}>58mm</option>
                    <option value="80mm" ${state.config.paperWidth === "80mm" ? "selected" : ""}>80mm</option>
                  </select>
                </label>
              </div>
            </section>

            <button type="submit" class="button-primary admin-submit-button">Save settings</button>
          </form>
        </section>
      </main>

      <aside class="admin-page-side">
        <section class="admin-side-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Desktop tools</p>
              <h2>Refresh and pairing</h2>
              <p>All service refresh and device maintenance controls now live inside settings.</p>
            </div>
          </div>
          <div class="admin-action-grid">
            <button class="button-primary admin-submit-button" data-action="refresh-now">Refresh now</button>
            <button class="button-ghost compact-button" data-action="refresh-printers">Refresh printers</button>
            <button class="button-ghost compact-button" data-action="register-station">Register / rotate token</button>
            <button class="button-ghost compact-button" data-action="test-print">Test print</button>
          </div>
        </section>

        <section class="admin-side-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Device status</p>
              <h2>Current workstation snapshot</h2>
              <p>Quick reference for the paired desktop, current printer target, and heartbeat state.</p>
            </div>
          </div>
          <div class="admin-breakdown-list">
            ${renderBreakdownRow("Station", stationSummary)}
            ${renderBreakdownRow("Printer", printerSummary)}
            ${renderBreakdownRow("Discovered printers", String(state.printers.length))}
            ${renderBreakdownRow("Last heartbeat", formatDate(state.lastHeartbeatAt))}
            ${renderBreakdownRow("Last activity", state.lastActivity || "Idle")}
          </div>
        </section>
      </aside>
    </section>
  `;
}

function renderPreviousView(state: AgentState) {
  const systemInfo = getSystemInfo();

  return `
    <section class="admin-page-layout">
      <main class="admin-page-main">
        <section class="admin-surface-card admin-table-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Previous</p>
              <h2>Recent outcomes</h2>
              <p>Historical print outcomes have moved here to keep the homepage focused on live service.</p>
            </div>
            <div class="admin-section-actions">
              <span class="admin-badge warning">${state.history.length} tracked</span>
            </div>
          </div>
          <div class="admin-history-grid">
            ${
              state.history.length
                ? state.history.map((job) => renderHistoryJob(job)).join("")
                : `<div class="admin-empty-card">No print history yet.</div>`
            }
          </div>
        </section>
      </main>

      <aside class="admin-page-side">
        <section class="admin-side-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Previous</p>
              <h2>Operating system</h2>
              <p>Device and environment details are grouped here with the historical station information.</p>
            </div>
          </div>
          <div class="admin-breakdown-list">
            ${renderBreakdownRow("Platform", systemInfo.platform)}
            ${renderBreakdownRow("Language", systemInfo.language)}
            ${renderBreakdownRow("Connectivity", systemInfo.online)}
            ${renderBreakdownRow("CPU threads", systemInfo.concurrency)}
            ${renderBreakdownRow("Timezone", systemInfo.timeZone)}
            ${renderBreakdownRow("User agent", systemInfo.userAgent)}
          </div>
        </section>

        <section class="admin-side-card">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Recorded snapshot</p>
              <h2>Last known service state</h2>
              <p>Helpful context for diagnosing what the workstation was doing most recently.</p>
            </div>
          </div>
          <div class="admin-breakdown-list">
            ${renderBreakdownRow("Connection", toLabel(state.connectionState))}
            ${renderBreakdownRow("Queue size", String(state.queue.length))}
            ${renderBreakdownRow("Last heartbeat", formatDate(state.lastHeartbeatAt))}
            ${renderBreakdownRow("Last activity", state.lastActivity || "Idle")}
            ${renderBreakdownRow("Last error", state.lastError || "None")}
          </div>
        </section>
      </aside>
    </section>
  `;
}

function renderDashboardView(state: AgentState) {
  const currentJob = state.queue.find((job) => job.id === state.currentJobId) ?? state.queue[0] ?? null;
  const printedCount = state.history.filter((job) => job.status === "printed").length;
  const failedCount = state.history.filter((job) => job.status === "failed").length;
  const printerSummary = state.config.selectedPrinter || "No printer selected";
  const isOffline = !state.config.autoPrintEnabled;

  return `
    <section class="admin-page-layout admin-dashboard-compact">
      <main class="admin-page-main">
        <section class="admin-metric-grid">
          ${renderMetricCard("Connection", toLabel(state.connectionState), printerSummary, getMetricTone(state.connectionState))}
          ${renderMetricCard("Queue", String(state.queue.length), state.queue.length ? `${state.queue.length} waiting` : "Clear", state.queue.length ? "gold" : "orange")}
          ${renderMetricCard("Printed", String(printedCount), `${failedCount} failed`, printedCount ? "orange" : "gold")}
        </section>

        <section class="admin-visual-grid">
          <article class="admin-surface-card">
            <div class="admin-section-header">
              <div>
                <p class="eyebrow">Live service</p>
                <h2>Station overview</h2>
              </div>
              <span class="admin-badge ${getBadgeClass(state.status)}">${escapeHtml(toLabel(state.status))}</span>
            </div>
            <div class="admin-breakdown-list compact">
              ${renderBreakdownRow("Station", state.config.stationName || "Kitchen Station")}
              ${renderBreakdownRow("Printer", printerSummary)}
              ${renderBreakdownRow("Focus", currentJob ? `${currentJob.orderNumber} — ${currentJob.customerName}` : "No active ticket")}
            </div>
          </article>

          <article class="admin-surface-card">
            <div class="admin-section-header">
              <div>
                <p class="eyebrow">Service mode</p>
                <h2>Online / Offline</h2>
              </div>
            </div>
            <div class="admin-offline-toggle-area">
              <div class="admin-offline-toggle-row">
                <div class="admin-offline-toggle-label">
                  <strong>${isOffline ? "Agent is offline" : "Agent is online"}</strong>
                  <span>${isOffline ? "Not receiving new jobs" : "Listening for print jobs"}</span>
                </div>
                <button
                  type="button"
                  class="admin-toggle-switch ${isOffline ? "is-off" : "is-on"}"
                  data-action="${isOffline ? "go-online" : "go-offline"}"
                  aria-label="${isOffline ? "Switch online" : "Switch offline"}"
                >
                  <span class="admin-toggle-knob" />
                </button>
              </div>
            </div>
          </article>
        </section>

        <section class="admin-surface-card" id="${getSectionId("queue")}">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Queue</p>
              <h2>Incoming ticket</h2>
            </div>
            <span class="admin-badge ${state.queue.length ? "warning" : "success"}">${state.queue.length ? `${state.queue.length} queued` : "Queue clear"}</span>
          </div>
          <div class="admin-panel-grid">
            ${
              state.queue.length
                ? state.queue.slice(0, 1).map((job) => `
                    <article class="admin-job-card">
                      <div class="admin-card-topline">
                        <div>
                          <h3>${escapeHtml(job.orderNumber)}</h3>
                          <p>${escapeHtml(job.customerName)} | ${formatMoney(job.total)} | ${escapeHtml(toLabel(job.fulfillmentType))}</p>
                        </div>
                        <span class="admin-badge ${getBadgeClass(job.status)}">${escapeHtml(toLabel(job.status))}</span>
                      </div>
                      <div class="admin-card-actions">
                        <button class="button-ghost compact-button" data-action="print-job" data-job-id="${job.id}">Print / Retry</button>
                      </div>
                    </article>
                  `).join("")
                : `<div class="admin-empty-card">No queued jobs right now.</div>`
            }
          </div>
        </section>
      </main>

      <aside class="admin-page-side">
        <section class="admin-side-card" id="${getSectionId("activity")}">
          <div class="admin-section-header">
            <div>
              <p class="eyebrow">Activity</p>
              <h2>Operator feed</h2>
            </div>
          </div>

          ${
            state.lastError
              ? `<div class="admin-inline-alert danger"><strong>Attention needed</strong><span>${escapeHtml(state.lastError)}</span></div>`
              : `<div class="admin-inline-alert success"><strong>Station healthy</strong><span>No active errors.</span></div>`
          }

          <div class="admin-timeline">
            ${
              state.logs.length
                ? state.logs.slice(0, 2).map((log) => renderLog(log)).join("")
                : `<div class="admin-empty-card">No log entries yet.</div>`
            }
          </div>

          ${state.logs.length > 2 ? `
            <div class="admin-card-actions" style="margin-top: 0.75rem;">
              <button type="button" class="button-ghost compact-button" data-action="show-all-logs">
                Explore more (${state.logs.length} total)
              </button>
            </div>
          ` : ""}
        </section>
      </aside>
    </section>
  `;
}

function render(state: AgentState) {
  latestState = state;

  const key = getRenderKey(state);
  if (key === lastRenderKey) {
    return;
  }
  lastRenderKey = key;

  const allOrders = deriveOrders(state);
  const activeSection = uiState.activeDashboardSection;

  let pageTitle = "Print Agent Dashboard";
  let pageSubtitle = "Monitor kitchen tickets, pairing status, and printer routing from a desktop shell that mirrors the extadmin control room.";

  if (uiState.view === "orders") {
    pageTitle = "Orders";
    pageSubtitle = "View all available order history, filter records quickly, and inspect the latest order data from the agent.";
  } else if (uiState.view === "settings") {
    pageTitle = "Settings";
    pageSubtitle = "System configuration, device controls, and printer hardware now live together in one settings workspace.";
  } else if (uiState.view === "previous") {
    pageTitle = "Previous";
    pageSubtitle = "Review historical outcomes and previously recorded device information without cluttering the live homepage.";
  }

  root.innerHTML = `
    <main class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-brand">
          <div class="admin-brand-mark">PA</div>
          <div>
            <div class="admin-brand-title-row">
              <strong>RCC Print Agent</strong>
              <span class="admin-status-dot" aria-hidden="true"></span>
            </div>
            <span>Kitchen station workspace</span>
          </div>
        </div>

        <nav class="admin-sidebar-nav" aria-label="Print agent sections">
          ${renderSidebarLink("Queue", "Live station queue", {
            active: uiState.view === "dashboard" && activeSection === "queue",
            section: "queue"
          })}
          ${renderSidebarLink("Orders", `${allOrders.length} tracked orders`, {
            active: uiState.view === "orders",
            view: "orders"
          })}
          ${renderSidebarLink("Settings", "Desktop and hardware setup", {
            active: uiState.view === "settings",
            view: "settings"
          })}
          ${renderSidebarLink("Previous", `${state.history.length} historical records`, {
            active: uiState.view === "previous",
            view: "previous"
          })}
          ${renderSidebarLink("Activity", state.lastActivity || "Local event feed", {
            active: uiState.view === "dashboard" && activeSection === "activity",
            section: "activity"
          })}
        </nav>

        <div class="admin-sidebar-footer">
          <div class="admin-upgrade-card">
            <p>Station posture</p>
            <strong>${escapeHtml(toLabel(state.connectionState))}</strong>
            <span>${escapeHtml(state.config.selectedPrinter || "No printer selected")}</span>
          </div>
          <div class="admin-upgrade-card subtle">
            <p>Pairing token</p>
            <strong>${escapeHtml(maskToken(state.config.stationToken))}</strong>
            <span>${escapeHtml(state.stationId || "Register this device to start receiving jobs.")}</span>
          </div>
        </div>
      </aside>

      <div class="admin-stage">
        <header class="admin-topbar">
          <div class="admin-topbar-copy">
            <p class="eyebrow">Protected workspace</p>
            <h1>${escapeHtml(pageTitle)}</h1>
            <p>${escapeHtml(pageSubtitle)}</p>
          </div>
          <div class="admin-topbar-tools">
            <label class="admin-search-shell" aria-label="Station summary">
              <span class="admin-search-icon">S</span>
              <input value="${escapeHtml(state.config.stationName || "Kitchen Station")}" readonly />
            </label>
            <div class="admin-utility-cluster">
              <div class="admin-profile-chip">
                <div class="admin-profile-copy">
                  <strong>${escapeHtml(toLabel(state.connectionState))}</strong>
                  <span>${escapeHtml(state.appVersion)}</span>
                </div>
                <div class="admin-profile-avatar">PA</div>
              </div>
            </div>
          </div>
        </header>

        <div class="admin-stage-body">
          <div class="admin-page-frame">
            ${
              uiState.view === "orders"
                ? renderOrdersView(state, allOrders)
                : uiState.view === "settings"
                  ? renderSettingsView(state)
                  : uiState.view === "previous"
                    ? renderPreviousView(state)
                    : renderDashboardView(state)
            }
          </div>
        </div>
      </div>
    </main>

    ${
      uiState.selectedOrderId && allOrders.find((o) => o.orderId === uiState.selectedOrderId)
        ? `
          <div class="admin-modal-overlay" data-action="close-order-modal">
            <div class="admin-modal">
              <div class="admin-modal-header">
                <h2>Order details</h2>
                <button type="button" class="admin-modal-close" data-action="close-order-modal" aria-label="Close">&#10005;</button>
              </div>
              ${renderOrderDetails(allOrders.find((o) => o.orderId === uiState.selectedOrderId)!)}
            </div>
          </div>
        `
        : ""
    }

    ${uiState.alertJob ? renderOrderAlertPopup(uiState.alertJob) : ""}
  `;

  if (uiState.view === "dashboard" && uiState.pendingScrollTarget) {
    const targetId = getSectionId(uiState.pendingScrollTarget);

    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        block: "start",
        behavior: "smooth"
      });
    });

    uiState.pendingScrollTarget = null;
  }
}

function renderLoadingState() {
  root.innerHTML = `
    <main class="admin-shell admin-shell-loading">
      <section class="admin-loading-panel">
        <div class="admin-brand-mark">PA</div>
        <div>
          <p class="eyebrow">Loading workspace</p>
          <h1>Preparing print dashboard</h1>
          <p>Loading station state, queue, and order history.</p>
        </div>
      </section>
    </main>
  `;
}

function resetOrderFilters() {
  uiState.filters = {
    search: "",
    status: "all",
    orderType: "all",
    dateFrom: "",
    dateTo: ""
  };
  uiState.selectedOrderId = undefined;
}

async function initialize() {
  renderLoadingState();
  const state = await window.printAgent.getState();
  render(state);

  window.printAgent.subscribeState((nextState) => {
    render(nextState);
  });

  window.printAgent.onNewOrder((job) => {
    startAlertSound();
    uiState.alertJob = job;

    if (latestState) {
      render(latestState);
    }
  });

  window.printAgent.onPrintSucceeded(() => {
    stopAlertSound();
    uiState.alertJob = undefined;

    if (latestState) {
      render(latestState);
    }
  });

  window.printAgent.onPrintFailed((job) => {
    if (!uiState.alertJob) {
      uiState.alertJob = job;
    }

    if (latestState) {
      render(latestState);
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.id === "settings-form") {
      event.preventDefault();
      const formData = new FormData(form);
      await window.printAgent.updateConfig({
        serverUrl: String(formData.get("serverUrl") ?? ""),
        tenantId: String(formData.get("tenantId") ?? ""),
        stationName: String(formData.get("stationName") ?? ""),
        registrationKey: String(formData.get("registrationKey") ?? ""),
        stationToken: String(formData.get("stationToken") ?? ""),
        paperWidth: String(formData.get("paperWidth") ?? "80mm") as AgentState["config"]["paperWidth"],
        selectedPrinter: String(formData.get("selectedPrinter") ?? ""),
        autoPrintEnabled: String(formData.get("autoPrintEnabled") ?? "true") === "true",
        launchOnStartup: String(formData.get("launchOnStartup") ?? "false") === "true",
        deviceId: String(formData.get("deviceId") ?? "")
      });
      await window.printAgent.refreshNow();
      return;
    }

    if (form.id === "orders-filters-form") {
      event.preventDefault();
      const formData = new FormData(form);
      uiState.filters = {
        search: String(formData.get("search") ?? ""),
        status: String(formData.get("status") ?? "all") as OrderFilterStatus,
        orderType: String(formData.get("orderType") ?? "all") as OrderFilterType,
        dateFrom: String(formData.get("dateFrom") ?? ""),
        dateTo: String(formData.get("dateTo") ?? "")
      };

      if (latestState) {
        render(latestState);
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const navButton = target.closest<HTMLElement>("[data-nav-view], [data-nav-dashboard]");

    if (navButton) {
      const view = navButton.dataset.navView as AppView | undefined;
      const section = navButton.dataset.navDashboard as DashboardSection | undefined;

      uiState.selectedOrderId = undefined;

      if (view) {
        uiState.view = view;
      } else if (section) {
        uiState.view = "dashboard";
        uiState.activeDashboardSection = section;
        uiState.pendingScrollTarget = section;
      }

      if (latestState) {
        render(latestState);
      }

      return;
    }

    const actionElement = target.closest<HTMLElement>("[data-action]");

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;

    if (action === "refresh-now") {
      await window.printAgent.refreshNow();
      return;
    }

    if (action === "register-station") {
      await window.printAgent.registerStation();
      return;
    }

    if (action === "refresh-printers") {
      await window.printAgent.refreshPrinters();
      return;
    }

    if (action === "test-print") {
      await window.printAgent.testPrint();
      return;
    }

    if (action === "print-job" && actionElement.dataset.jobId) {
      await window.printAgent.printJob(actionElement.dataset.jobId);
      return;
    }

    if (action === "reprint-order" && actionElement.dataset.jobId) {
      await window.printAgent.printJob(actionElement.dataset.jobId);
      return;
    }

    if (action === "toggle-order-details" && actionElement.dataset.orderId) {
      uiState.selectedOrderId = actionElement.dataset.orderId;

      if (latestState) {
        render(latestState);
      }

      return;
    }

    if (action === "go-online") {
      await window.printAgent.updateConfig({ autoPrintEnabled: true });
      await window.printAgent.refreshNow();
      return;
    }

    if (action === "go-offline") {
      await window.printAgent.updateConfig({ autoPrintEnabled: false });
      if (latestState) {
        render(latestState);
      }
      return;
    }

    if (action === "show-all-logs") {
      uiState.view = "dashboard";
      uiState.activeDashboardSection = "activity";
      uiState.pendingScrollTarget = "activity";

      if (latestState) {
        render(latestState);
      }
      return;
    }

    if (action === "close-order-modal") {
      uiState.selectedOrderId = undefined;

      if (latestState) {
        render(latestState);
      }
      return;
    }

    if (action === "clear-order-filters") {
      resetOrderFilters();

      if (latestState) {
        render(latestState);
      }
    }

    if (action === "acknowledge-alert" && actionElement.dataset.jobId) {
      const jobId = actionElement.dataset.jobId;
      uiState.alertJob = undefined;
      stopAlertSound();

      if (latestState) {
        render(latestState);
      }

      await window.printAgent.acknowledgeOrder(jobId);
      return;
    }

    if (action === "save-pdf-alert" && actionElement.dataset.jobId) {
      const jobId = actionElement.dataset.jobId;
      uiState.alertJob = undefined;
      stopAlertSound();

      if (latestState) {
        render(latestState);
      }

      await window.printAgent.saveAsPdf(jobId);
      return;
    }
  });
}

void initialize();
