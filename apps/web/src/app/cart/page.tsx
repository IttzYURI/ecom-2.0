import { CartPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function CartRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
