import { LayoutShell } from "../../components/layout-shell";
import { FaqPage } from "../../components/storefront";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function FaqRoute() {
  const bundle = getTenantBundle(getDefaultTenant().id);

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
