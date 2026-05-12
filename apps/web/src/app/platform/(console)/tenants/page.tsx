import { BusinessesPageClient } from "../../../../components/platform-businesses-client";
import { PlatformAdminService } from "../../../../lib/platform-admin-service";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const restaurants = await new PlatformAdminService().listRestaurants();

  return (
    <div className="platform-page-content">
      <BusinessesPageClient restaurants={restaurants} />
    </div>
  );
}
