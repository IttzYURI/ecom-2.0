import { LayoutShell } from "../../components/layout-shell";
import { ReviewsPage } from "../../components/storefront";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function ReviewsRoute() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      eyebrow="Guest feedback"
      title="Reviews"
      subtitle="Real guest feedback that helps new customers trust the experience."
    >
      <ReviewsPage bundle={bundle} />
    </LayoutShell>
  );
}
