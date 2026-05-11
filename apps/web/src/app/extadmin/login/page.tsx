import { ExtAdminLoginCard } from "../../../components/extadmin";
import { PlatformAdminService } from "../../../lib/platform-admin-service";
import { getPlatformSessionFromCookieStore } from "../../../lib/platform-auth";
import { getStoredTenantOwnerUser } from "../../../lib/extadmin-user-store";

export const metadata = {
  title: "Restaurant Owner Login"
};

export default async function ExtAdminLoginRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const platformTenant = Array.isArray(params.platformTenant)
    ? params.platformTenant[0]
    : params.platformTenant;
  const platformSession = await getPlatformSessionFromCookieStore();
  const restaurant =
    platformSession && platformTenant
      ? await new PlatformAdminService().getRestaurant(platformTenant)
      : null;
  const ownerUser = restaurant ? await getStoredTenantOwnerUser(restaurant.tenant.id) : null;

  return (
    <ExtAdminLoginCard
      error={error === "invalid" ? "Invalid owner credentials." : null}
      tenantName={restaurant?.tenant.name ?? null}
      defaultEmail={ownerUser?.email ?? null}
      platformTenantId={restaurant?.tenant.id ?? null}
    />
  );
}
