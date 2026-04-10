import { TenantCatalogPage } from "../../../components/admin";
import { LayoutShell } from "../../../components/layout-shell";
import { getDefaultTenant, getTenantBundle } from "../../../lib/mock-data";

export default function AdminMenuPage() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      title="Catalog Management"
      subtitle="Categories, menu items, pricing, and visibility live under tenant ownership."
    >
      <TenantCatalogPage bundle={bundle} />
    </LayoutShell>
  );
}
