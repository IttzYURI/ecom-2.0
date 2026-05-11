import { redirect } from "next/navigation";

import { TenantAdminDashboard } from "../../components/admin";
import { LayoutShell } from "../../components/layout-shell";
import { getExtAdminSessionFromCookieStore } from "../../lib/extadmin-auth";
import { getTenantBundle } from "../../lib/mock-data";

export default async function AdminPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = getTenantBundle(session.tenantId);

  return (
    <LayoutShell
      title={`${bundle.tenant.name} Admin`}
      subtitle="Restaurant operations dashboard for orders, settings, content, menu, and staffing."
    >
      <TenantAdminDashboard bundle={bundle} />
    </LayoutShell>
  );
}
