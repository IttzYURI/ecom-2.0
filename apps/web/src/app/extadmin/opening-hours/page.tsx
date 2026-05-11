import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";

export const dynamic = "force-dynamic";

export default async function ExtAdminOpeningHoursPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  return (
    <ExtAdminShell title="Opening Hours" subtitle="Set operating hours for each day of the week. These hours are shown on the public storefront.">
      <section className="admin-page-stack">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Schedule</p>
              <h3>Weekly hours</h3>
              <p>Opening hours configuration will be stored here once the backend model is ready. Use Restaurant Settings for now to describe availability.</p>
            </div>
          </div>
          <div className="admin-panel-grid">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
              <section key={day} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{day}</p>
                  </div>
                </div>
                <div className="admin-breakdown-list compact">
                  <div className="admin-breakdown-row">
                    <strong>Status</strong>
                    <span className="admin-badge success">Configured via Settings</span>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="admin-surface-card admin-info-strip">
          <div>
            <p className="eyebrow">Coming soon</p>
            <h3>Full scheduling</h3>
          </div>
          <div className="admin-inline-notes">
            <span>Per-day open/close times</span>
            <span>Special holiday hours</span>
            <span>Auto-pause ordering outside hours</span>
          </div>
        </article>
      </section>
    </ExtAdminShell>
  );
}
