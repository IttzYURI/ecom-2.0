import { ExtAdminBookingsPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminBookingsRoute() {
  const bundle = await getRuntimeTenantBundleWithOperations(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Booking Management"
      subtitle="Review reservation requests and keep table availability aligned with restaurant operations."
    >
      <ExtAdminBookingsPage bundle={bundle} />
    </ExtAdminShell>
  );
}
