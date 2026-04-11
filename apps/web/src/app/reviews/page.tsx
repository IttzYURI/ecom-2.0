import { LayoutShell } from "../../components/layout-shell";
import { ReviewsPage } from "../../components/storefront";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ReviewsRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
