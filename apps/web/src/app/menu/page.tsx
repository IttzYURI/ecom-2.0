import { LayoutShell } from "../../components/layout-shell";
import { MenuPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function MenuRoute() {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <LayoutShell
      eyebrow="Food menu"
      title="Menu"
      subtitle="Browse signature dishes, choose your favorites, and order directly from the restaurant."
    >
      <MenuPage bundle={bundle} />
    </LayoutShell>
  );
}
