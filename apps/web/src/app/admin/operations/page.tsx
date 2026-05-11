import { redirect } from "next/navigation";

import { TenantOperationsPage } from "../../../components/admin";
import { LayoutShell } from "../../../components/layout-shell";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getTenantBundle } from "../../../lib/mock-data";

export default async function AdminOperationsPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = getTenantBundle(session.tenantId);

  return (
    <LayoutShell
      title="Operations"
      subtitle="Bookings, staff, and permissions represent the tenant-side operating surface."
    >
      <TenantOperationsPage bundle={bundle} />
    </LayoutShell>
  );
}
