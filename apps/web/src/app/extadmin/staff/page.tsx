import { ExtAdminShell, ExtAdminStaffPage } from "../../../components/extadmin";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminStaffRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Staff Access"
      subtitle="Create staff logins, assign roles, and reset access without changing the public restaurant website."
    >
      <ExtAdminStaffPage bundle={bundle} />
    </ExtAdminShell>
  );
}
