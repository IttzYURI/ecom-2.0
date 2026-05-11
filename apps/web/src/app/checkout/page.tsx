import { FeatureGate } from "../../components/feature-gate";
import { CheckoutPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function CheckoutRoute() {
  const { bundle, status, features } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <FeatureGate features={features} flag="onlineOrdering">
      <LayoutShell
        eyebrow="Checkout"
        title="Checkout"
        subtitle="Delivery details, payment choice, and final confirmation all happen here."
      >
        <CheckoutPageContent bundle={bundle} />
      </LayoutShell>
    </FeatureGate>
  );
}
