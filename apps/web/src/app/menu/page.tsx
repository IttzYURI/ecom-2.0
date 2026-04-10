import { LayoutShell } from "../../components/layout-shell";
import { MenuPage } from "../../components/storefront";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function MenuRoute() {
  const bundle = getTenantBundle(getDefaultTenant().id);

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
