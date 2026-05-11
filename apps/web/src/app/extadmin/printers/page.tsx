import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getPrintingSnapshot } from "../../../lib/printing-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminPrintersPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const snapshot = await getPrintingSnapshot(session.tenantId);

  return (
    <ExtAdminShell title="Printer Settings" subtitle="Manage print stations, monitor connection health, and review recent print jobs.">
      <section className="admin-page-stack">
        <section className="admin-metric-grid">
          <article className="admin-metric-card tone-forest">
            <div className="admin-metric-copy">
              <p>Stations</p>
              <h3>{snapshot.stations.length}</h3>
              <span>{snapshot.stations.filter((s) => s.enabled).length} enabled</span>
            </div>
          </article>
          <article className="admin-metric-card tone-orange">
            <div className="admin-metric-copy">
              <p>Print jobs</p>
              <h3>{snapshot.jobs.length}</h3>
              <span>Total processed</span>
            </div>
          </article>
          <article className="admin-metric-card tone-gold">
            <div className="admin-metric-copy">
              <p>Orders printed</p>
              <h3>{snapshot.orderPrintStates.length}</h3>
              <span>With kitchen tickets</span>
            </div>
          </article>
        </section>

        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Stations</p>
              <h3>Print stations</h3>
              <p>Registered print devices connected to this restaurant.</p>
            </div>
          </div>
          <div className="admin-panel-grid">
            {snapshot.stations.map((station) => (
              <section key={station.id} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Station</p>
                    <h3>{station.name}</h3>
                    <p>{station.printerName ?? "No printer assigned"}</p>
                  </div>
                  <span className={`admin-badge ${station.enabled ? "success" : "danger"}`}>
                    {station.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="admin-breakdown-list compact">
                  <div className="admin-breakdown-row">
                    <strong>Paper width</strong>
                    <span>{station.paperWidth}</span>
                  </div>
                  <div className="admin-breakdown-row">
                    <strong>Auto-print</strong>
                    <span>{station.autoPrintEnabled ? "On" : "Off"}</span>
                  </div>
                  <div className="admin-breakdown-row">
                    <strong>Last seen</strong>
                    <span>{station.lastSeenAt ? new Date(station.lastSeenAt).toLocaleString() : "Never"}</span>
                  </div>
                  <div className="admin-breakdown-row">
                    <strong>Last activity</strong>
                    <span>{station.lastActivityMessage ?? "None"}</span>
                  </div>
                </div>
              </section>
            ))}
            {!snapshot.stations.length ? (
              <div className="admin-empty-card">No print stations registered yet. Register from the print agent desktop app.</div>
            ) : null}
          </div>
        </article>

        <article className="admin-surface-card admin-table-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">History</p>
              <h3>Recent print jobs</h3>
              <p>Last print operations for this restaurant.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.jobs.slice(0, 20).map((job) => (
                  <tr key={job.id}>
                    <td data-label="Job">{job.jobKey.slice(0, 20)}</td>
                    <td data-label="Order">{job.orderNumber}</td>
                    <td data-label="Type">{job.copyType}</td>
                    <td data-label="Status">
                      <span className={`admin-badge ${job.status === "printed" ? "success" : job.status === "failed" ? "danger" : "warning"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td data-label="Created">{new Date(job.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!snapshot.jobs.length ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">No print jobs yet.</td>
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
