import { CheckoutPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function CheckoutRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      eyebrow="Checkout"
      title="Checkout"
      subtitle="Delivery details, payment choice, and final confirmation all happen here."
    >
      <CheckoutPageContent bundle={bundle} />
    </LayoutShell>
  );
}
