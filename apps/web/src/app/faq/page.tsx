import { LayoutShell } from "../../components/layout-shell";
import { FaqPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function FaqRoute() {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <LayoutShell
      eyebrow="Before you order"
      title="Frequently Asked Questions"
      subtitle="Everything customers usually want to know before placing an order or making a booking."
    >
      <FaqPage bundle={bundle} />
    </LayoutShell>
  );
}
