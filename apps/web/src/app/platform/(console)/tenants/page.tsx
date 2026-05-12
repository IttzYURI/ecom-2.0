import { PlatformBusinessesView } from "../../../../components/platform-admin";
import { PlatformAdminService } from "../../../../lib/platform-admin-service";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [restaurants, rawSearchParams] = await Promise.all([
    new PlatformAdminService().listRestaurants(),
    searchParams
  ]);
  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <div className="platform-page-content">
      <PlatformBusinessesView restaurants={restaurants} status={status} message={message} />
    </div>
  );
}
