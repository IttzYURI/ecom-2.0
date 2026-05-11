import { redirect } from "next/navigation";

import { ExtAdminSettingsPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";

export const dynamic = "force-dynamic";

export default async function ExtAdminSettingsRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundle(session.tenantId);

  return (
    <ExtAdminShell
      title="Restaurant Settings"
      subtitle="Review business details, delivery coverage, and operational information used across the website."
    >
      <ExtAdminSettingsPage bundle={bundle} />
    </ExtAdminShell>
  );
}
