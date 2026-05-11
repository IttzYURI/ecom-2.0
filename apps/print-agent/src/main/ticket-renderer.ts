import type { AgentConfig, AgentJobSummary, PrintPaperWidth } from "../shared/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getWidthStyles(paperWidth: PrintPaperWidth) {
  return paperWidth === "58mm"
    ? {
        pageWidth: "54mm",
        fontSize: "11px",
        orderFontSize: "24px"
      }
    : {
        pageWidth: "76mm",
        fontSize: "12px",
        orderFontSize: "28px"
      };
}

export function renderTicketHtml(
  job: AgentJobSummary,
  config: Pick<AgentConfig, "paperWidth" | "stationName">
) {
  const width = getWidthStyles(config.paperWidth);
  const customerDetails = [
    `Customer: ${job.customerName}`,
    `Phone: ${job.customerPhone || "N/A"}`,
    job.fulfillmentType === "delivery" && job.address ? `Address: ${job.address}` : "Collection order"
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  const items = job.items
    .map(
      (item) => `
        <div class="line-item">
          <div class="line-item-top">
            <strong>${item.quantity} x ${escapeHtml(item.name)}</strong>
          </div>
          ${item.note ? `<div class="line-note">Note: ${escapeHtml(item.note)}</div>` : ""}
        </div>
      `
    )
    .join("");
  const copyLabel =
    job.triggerType === "manual_reprint" ? `REPRINT | Print #${job.printCount}` : `Print #${job.printCount}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(job.orderNumber)}</title>
    <style>
      @page {
        margin: 4mm;
      }

      body {
        width: ${width.pageWidth};
        font-family: "Segoe UI", sans-serif;
        font-size: ${width.fontSize};
        color: #111;
        margin: 0 auto;
      }

      .ticket {
        padding-bottom: 8mm;
      }

      .center {
        text-align: center;
      }

      .order-number {
        font-size: ${width.orderFontSize};
        font-weight: 800;
        margin: 6px 0 2px;
      }

      .section {
        border-top: 1px dashed #222;
        padding-top: 8px;
        margin-top: 8px;
      }

      .line-item {
        margin-bottom: 8px;
      }

      .line-note {
        padding-left: 8px;
        font-style: italic;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }

      .copy-label {
        margin-top: 12px;
        font-size: 13px;
        font-weight: 700;
      }

      .muted {
        color: #555;
      }
    </style>
  </head>
  <body>
    <main class="ticket">
      <section class="center">
        <div><strong>${escapeHtml(job.orderNumber)}</strong></div>
        <div class="order-number">${escapeHtml(job.orderNumber)}</div>
        <div>${new Date(job.createdAt).toLocaleString()}</div>
        <div><strong>${escapeHtml(job.fulfillmentType.toUpperCase())}</strong></div>
        <div><strong>${escapeHtml(job.paymentStatus === "paid" ? "PAID" : "CASH DUE")}</strong></div>
      </section>

      <section class="section">
        <div><strong>${escapeHtml(job.orderNumber)}</strong></div>
        <div>${escapeHtml(job.customerName)}</div>
        ${customerDetails}
      </section>

      <section class="section">
        ${items}
      </section>

      <section class="section">
        <div class="totals-row"><span>Order status</span><strong>${escapeHtml(job.orderStatus)}</strong></div>
        <div class="totals-row"><span>Payment</span><strong>${escapeHtml(job.paymentStatus)}</strong></div>
        <div class="totals-row"><span>Total</span><strong>${formatMoney(job.total)}</strong></div>
      </section>

      <section class="section center">
        <div class="copy-label">${escapeHtml(copyLabel)}</div>
        <div class="muted">${escapeHtml(config.stationName)}</div>
      </section>
    </main>
  </body>
</html>`;
}

export function createTestTicket(config: Pick<AgentConfig, "paperWidth" | "stationName">): AgentJobSummary {
  return {
    id: "test-print",
    orderId: "test-order",
    orderNumber: "TEST-1001",
    status: "printing",
    copyType: "kitchen",
    triggerType: "manual_reprint",
    createdAt: new Date().toISOString(),
    attemptCount: 1,
    customerName: "Printer Test",
    customerPhone: "+1 555-0100",
    address: "123 Kitchen Lane",
    fulfillmentType: "delivery",
    paymentStatus: "paid",
    orderStatus: "placed",
    items: [
      {
        name: "Margherita Pizza",
        quantity: 2,
        note: "Extra basil"
      },
      {
        name: "Garlic Bread",
        quantity: 1
      }
    ],
    total: 24.5,
    printCount: 1
  };
}
