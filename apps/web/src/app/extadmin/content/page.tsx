import { ExtAdminContentPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminContentRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Content Management"
      subtitle="Control the public-facing homepage, trust sections, and informational content shown to customers."
    >
      <ExtAdminContentPage bundle={bundle} />
    </ExtAdminShell>
  );
}
