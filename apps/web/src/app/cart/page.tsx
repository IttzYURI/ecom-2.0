import { CartPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function CartRoute() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      eyebrow="Your basket"
      title="Cart"
      subtitle="Review your selections before continuing to checkout."
    >
      <CartPageContent bundle={bundle} />
    </LayoutShell>
  );
}
