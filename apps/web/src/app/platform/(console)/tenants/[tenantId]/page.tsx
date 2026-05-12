import { notFound } from "next/navigation";

import { PlatformTenantDetailView } from "../../../../../components/platform-admin";
import { PlatformAdminService } from "../../../../../lib/platform-admin-service";

export const dynamic = "force-dynamic";

export default async function PlatformTenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenantId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const restaurant = await new PlatformAdminService().getRestaurant(tenantId);

  if (!restaurant) {
    notFound();
  }

  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <div className="platform-page-content">
      <PlatformTenantDetailView restaurant={restaurant} status={status} message={message} />
    </div>
  );
}
