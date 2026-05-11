import { notFound, redirect } from "next/navigation";

import { PlatformTenantDetailView } from "../../../../components/platform-admin";
import { LayoutShell } from "../../../../components/layout-shell";
import { PlatformAdminService } from "../../../../lib/platform-admin-service";
import { getPlatformSessionFromCookieStore } from "../../../../lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function PlatformTenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPlatformSessionFromCookieStore();

  if (!session) {
    redirect("/platform/login" as never);
  }

  const [{ tenantId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const restaurant = await new PlatformAdminService().getRestaurant(tenantId);

  if (!restaurant) {
    notFound();
  }

  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <LayoutShell
      eyebrow="Super Admin"
      title={restaurant.tenant.name}
      subtitle="Manage tenant identity, subscription state, domains, features, printing health, and safe admin launch."
    >
      <PlatformTenantDetailView restaurant={restaurant} status={status} message={message} />
    </LayoutShell>
  );
}
