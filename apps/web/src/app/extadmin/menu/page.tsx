import { ExtAdminMenuPage, ExtAdminShell } from "../../../components/extadmin";
import { getStoredStorefrontContent } from "../../../lib/content-store";
import { getStoredMenuContent, getRuntimeTenantBundleWithMenu } from "../../../lib/menu-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminMenuRoute() {
  const tenantId = getDefaultTenant().id;
  const content = await getStoredStorefrontContent(tenantId);
  const bundle = await getRuntimeTenantBundleWithMenu(tenantId, content);
  const menu = await getStoredMenuContent(tenantId);

  return (
    <ExtAdminShell
      title="Menu Management"
      subtitle="Manage categories, item visibility, pricing, and product customization from the owner portal."
    >
      <ExtAdminMenuPage bundle={bundle} menu={menu} />
    </ExtAdminShell>
  );
}
