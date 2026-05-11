import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminReviewsPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundleWithOperations(session.tenantId);

  return (
    <ExtAdminShell title="Reviews" subtitle="Manage public reviews and testimonials displayed on the storefront.">
      <section className="admin-page-stack">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Social proof</p>
              <h3>Customer reviews</h3>
              <p>These reviews appear on the public website. Update review content from the Website Content page.</p>
            </div>
          </div>
          <div className="admin-panel-grid">
            {bundle.reviews.map((review) => (
              <section key={review.id} className="admin-subcard">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Review</p>
                    <h3>{review.author}</h3>
                  </div>
                  <span className={`admin-badge ${review.rating >= 4 ? "success" : "warning"}`}>
                    {review.rating}/5
                  </span>
                </div>
                <p>{review.content}</p>
              </section>
            ))}
            {!bundle.reviews.length ? (
              <div className="admin-empty-card">No reviews yet. Reviews can be added from the Website Content page.</div>
            ) : null}
          </div>
        </article>
      </section>
    </ExtAdminShell>
  );
}
