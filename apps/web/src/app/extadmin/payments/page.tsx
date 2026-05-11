import { redirect } from "next/navigation";

import { formatMoney } from "../../../lib/currency";
import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getStoredPayments } from "../../../lib/payments-store";

export const dynamic = "force-dynamic";

function getPaymentTone(status: string) {
  if (status === "paid") return "success";
  if (status === "failed" || status === "refunded") return "danger";
  return "warning";
}

export default async function ExtAdminPaymentsPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const payments = await getStoredPayments(session.tenantId);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments.filter((p) => p.status === "refunded").reduce((sum, p) => sum + p.amount, 0);

  return (
    <ExtAdminShell title="Payments" subtitle="Track payment attempts, confirmations, failures, and refunds.">
      <section className="admin-page-stack">
        <section className="admin-metric-grid">
          <article className="admin-metric-card tone-forest">
            <div className="admin-metric-copy">
              <p>Total paid</p>
              <h3>{formatMoney(totalPaid)}</h3>
              <span>{payments.filter((p) => p.status === "paid").length} successful payments</span>
            </div>
          </article>
          <article className="admin-metric-card tone-orange">
            <div className="admin-metric-copy">
              <p>Pending</p>
              <h3>{formatMoney(payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0))}</h3>
              <span>{payments.filter((p) => p.status === "pending").length} awaiting confirmation</span>
            </div>
          </article>
          <article className="admin-metric-card tone-gold">
            <div className="admin-metric-copy">
              <p>Refunded</p>
              <h3>{formatMoney(totalRefunded)}</h3>
              <span>{payments.filter((p) => p.status === "refunded").length} refunds</span>
            </div>
          </article>
        </section>

        <article className="admin-surface-card admin-table-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Ledger</p>
              <h3>Payment history</h3>
              <p>All payment records for this restaurant.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Payment">{payment.externalId.slice(0, 12)}</td>
                    <td data-label="Order">{payment.orderId.slice(0, 12)}</td>
                    <td data-label="Method">{payment.provider}</td>
                    <td data-label="Amount">{formatMoney(payment.amount)}</td>
                    <td data-label="Status">
                      <span className={`admin-badge ${getPaymentTone(payment.status)}`}>{payment.status}</span>
                    </td>
                    <td data-label="Created">{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!payments.length ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">No payment records yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </ExtAdminShell>
  );
}
