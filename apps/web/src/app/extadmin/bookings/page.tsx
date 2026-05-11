import { redirect } from "next/navigation";

import { ExtAdminBookingsPage, ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminBookingsRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundleWithOperations(session.tenantId);

  return (
    <ExtAdminShell
      title="Booking Management"
      subtitle="Review reservation requests and keep table availability aligned with restaurant operations."
    >
      <ExtAdminBookingsPage bundle={bundle} />
    </ExtAdminShell>
  );
}
