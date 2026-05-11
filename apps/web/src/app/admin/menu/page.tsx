import { redirect } from "next/navigation";

import { TenantCatalogPage } from "../../../components/admin";
import { LayoutShell } from "../../../components/layout-shell";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getTenantBundle } from "../../../lib/mock-data";

export default async function AdminMenuPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = getTenantBundle(session.tenantId);

  return (
    <LayoutShell
      title="Catalog Management"
      subtitle="Categories, menu items, pricing, and visibility live under tenant ownership."
    >
      <TenantCatalogPage bundle={bundle} />
    </LayoutShell>
  );
}
