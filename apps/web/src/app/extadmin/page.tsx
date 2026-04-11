import { ExtAdminDashboard, ExtAdminShell } from "../../components/extadmin";
import { getRuntimeTenantBundleWithOperations } from "../../lib/operations-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminHomeRoute() {
  const bundle = await getRuntimeTenantBundleWithOperations(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Owner Dashboard"
      subtitle="Manage the public website, incoming orders, bookings, and restaurant settings from one protected workspace."
    >
      <ExtAdminDashboard bundle={bundle} />
    </ExtAdminShell>
  );
}
