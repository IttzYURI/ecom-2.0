import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { listAuditEntries } from "../../../lib/audit-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminAuditPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const auditEntries = await listAuditEntries(session.tenantId, 50);

  return (
    <ExtAdminShell title="Audit Logs" subtitle="Security trail of privileged actions performed in this restaurant workspace.">
      <section className="admin-page-stack">
        <article className="admin-surface-card admin-table-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Security trail</p>
              <h3>Recent activity</h3>
              <p>Every privileged action logged with actor, target, and timestamp.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Summary</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="Action"><strong>{entry.action}</strong></td>
                    <td data-label="Actor">{entry.actorEmail}</td>
                    <td data-label="Target">{entry.target ?? "—"}</td>
                    <td data-label="Summary">{entry.summary}</td>
                    <td data-label="Time">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!auditEntries.length ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">No audit entries recorded yet.</td>
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
