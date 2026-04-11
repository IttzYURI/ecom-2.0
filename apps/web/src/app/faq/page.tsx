import { LayoutShell } from "../../components/layout-shell";
import { FaqPage } from "../../components/storefront";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function FaqRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
