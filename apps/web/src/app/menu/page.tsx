import { LayoutShell } from "../../components/layout-shell";
import { MenuPage } from "../../components/storefront";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function MenuRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
