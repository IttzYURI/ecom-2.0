import { ExtAdminSettingsPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminSettingsRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Restaurant Settings"
      subtitle="Review business details, delivery coverage, and operational information used across the website."
    >
      <ExtAdminSettingsPage bundle={bundle} />
    </ExtAdminShell>
  );
}
