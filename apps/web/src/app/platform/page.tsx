import { redirect } from "next/navigation";

import { PlatformOverview } from "../../components/platform-admin";
import { LayoutShell } from "../../components/layout-shell";
import { PlatformAdminService } from "../../lib/platform-admin-service";
import { getPlatformSessionFromCookieStore } from "../../lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function PlatformPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPlatformSessionFromCookieStore();

  if (!session) {
    redirect("/platform/login" as never);
  }

  const [dashboard, rawSearchParams] = await Promise.all([
    new PlatformAdminService().getDashboardData(),
    searchParams
  ]);
  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <LayoutShell
      eyebrow="Super Admin"
      title="Platform Super Admin"
      subtitle="Tenant lifecycle, support operations, payment governance, and platform-level control."
    >
      <PlatformOverview dashboard={dashboard} status={status} message={message} />
    </LayoutShell>
  );
}
