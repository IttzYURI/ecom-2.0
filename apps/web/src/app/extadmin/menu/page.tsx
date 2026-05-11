import { redirect } from "next/navigation";

import { ExtAdminMenuPage, ExtAdminShell } from "../../../components/extadmin";
import { getStoredStorefrontContent } from "../../../lib/content-store";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getStoredMenuContent, getRuntimeTenantBundleWithMenu } from "../../../lib/menu-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminMenuRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const tenantId = session.tenantId;
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
