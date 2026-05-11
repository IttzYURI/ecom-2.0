import { FeatureGate } from "../../components/feature-gate";
import { LayoutShell } from "../../components/layout-shell";
import { BookingPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function BookingRoute() {
  const { bundle, status, features } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <FeatureGate features={features} flag="tableBooking">
      <LayoutShell
        eyebrow="Reservations"
        title="Reservations"
        subtitle="Book directly with the restaurant for lunch, dinner, and special occasions."
      >
        <BookingPage tenantId={bundle.tenant.id} />
      </LayoutShell>
    </FeatureGate>
  );
}
