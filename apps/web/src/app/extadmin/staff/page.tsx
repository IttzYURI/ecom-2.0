import { redirect } from "next/navigation";

import { ExtAdminShell, ExtAdminStaffPage } from "../../../components/extadmin";
import { listAuditEntries } from "../../../lib/audit-store";
import { getRuntimeTenantBundle } from "../../../lib/content-store";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";

export const dynamic = "force-dynamic";

export default async function ExtAdminStaffRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const tenantId = session.tenantId;
  const bundle = await getRuntimeTenantBundle(tenantId);
  const auditEntries = await listAuditEntries(tenantId, 10);
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;

  return (
    <ExtAdminShell
      title="Staff Access"
      subtitle="Create staff logins, assign roles, and reset access without changing the public restaurant website."
    >
      <ExtAdminStaffPage
        bundle={bundle}
        auditEntries={auditEntries}
        status={status}
        message={message}
      />
    </ExtAdminShell>
  );
}
