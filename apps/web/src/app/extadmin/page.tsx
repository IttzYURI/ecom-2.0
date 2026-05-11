import { redirect } from "next/navigation";

import { ExtAdminDashboard, ExtAdminShell } from "../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../lib/extadmin-auth";
import { listStoredNotifications } from "../../lib/notifications-store";
import { getRuntimeTenantBundleWithOperations } from "../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminHomeRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const tenantId = session.tenantId;
  const [bundle, notifications] = await Promise.all([
    getRuntimeTenantBundleWithOperations(tenantId),
    listStoredNotifications(tenantId, 8)
  ]);

  return (
    <ExtAdminShell
      title="Owner Dashboard"
      subtitle="Manage the public website, incoming orders, bookings, and restaurant settings from one protected workspace."
    >
      <ExtAdminDashboard bundle={bundle} notifications={notifications} />
    </ExtAdminShell>
  );
}
