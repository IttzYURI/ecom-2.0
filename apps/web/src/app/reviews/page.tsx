import { FeatureGate } from "../../components/feature-gate";
import { LayoutShell } from "../../components/layout-shell";
import { ReviewsPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function ReviewsRoute() {
  const { bundle, status, features } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <FeatureGate features={features} flag="reviews">
      <LayoutShell
        eyebrow="Guest feedback"
        title="Reviews"
        subtitle="Real guest feedback that helps new customers trust the experience."
      >
        <ReviewsPage bundle={bundle} />
      </LayoutShell>
    </FeatureGate>
  );
}
