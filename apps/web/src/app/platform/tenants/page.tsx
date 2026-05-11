import { redirect } from "next/navigation";

import { PlatformTenantsDirectory } from "../../../components/platform-admin";
import { LayoutShell } from "../../../components/layout-shell";
import { PlatformAdminService } from "../../../lib/platform-admin-service";
import { getPlatformSessionFromCookieStore } from "../../../lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPlatformSessionFromCookieStore();

  if (!session) {
    redirect("/platform/login" as never);
  }
  const [restaurants, rawSearchParams] = await Promise.all([
    new PlatformAdminService().listRestaurants(),
    searchParams
  ]);
  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <LayoutShell
      eyebrow="Super Admin"
      title="Tenant Directory"
      subtitle="Create, activate, suspend, and inspect every restaurant tenant from one control plane."
    >
      <PlatformTenantsDirectory restaurants={restaurants} status={status} message={message} />
    </LayoutShell>
  );
}
