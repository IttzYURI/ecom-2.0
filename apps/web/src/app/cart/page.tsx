import { CartPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function CartRoute() {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <LayoutShell
      eyebrow="Your basket"
      title="Cart"
      subtitle="Review your selections before continuing to checkout."
      showHero={false}
    >
      <CartPageContent bundle={bundle} />
    </LayoutShell>
  );
}
