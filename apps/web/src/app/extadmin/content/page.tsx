import { redirect } from "next/navigation";

import { ExtAdminContentPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";

export const dynamic = "force-dynamic";

export default async function ExtAdminContentRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundle(session.tenantId);

  return (
    <ExtAdminShell
      title="Content Management"
      subtitle="Control the public-facing homepage, trust sections, and informational content shown to customers."
    >
      <ExtAdminContentPage bundle={bundle} />
    </ExtAdminShell>
  );
}
