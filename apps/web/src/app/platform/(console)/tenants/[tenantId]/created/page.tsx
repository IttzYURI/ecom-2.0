import { notFound } from "next/navigation";

import { PlatformProvisionSuccessView } from "../../../../../../components/platform-admin";
import { getStoredTenantOwnerUser } from "../../../../../../lib/extadmin-user-store";
import { PlatformAdminService } from "../../../../../../lib/platform-admin-service";
import { getTenantFeatureFlagsRecord } from "../../../../../../lib/tenant-feature-flags-store";
import { getTenantSetupRecord } from "../../../../../../lib/tenant-setup-store";

export const dynamic = "force-dynamic";

function buildTenantOrigin(domain: string) {
  return `https://${domain}`;
}

export default async function PlatformTenantCreatedPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenantId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const [restaurant, setup, featureFlags, ownerUser] = await Promise.all([
    new PlatformAdminService().getRestaurant(tenantId),
    getTenantSetupRecord(tenantId),
    getTenantFeatureFlagsRecord(tenantId),
    getStoredTenantOwnerUser(tenantId)
  ]);

  if (!restaurant || !setup) {
    notFound();
  }

  const inviteToken = Array.isArray(rawSearchParams.inviteToken)
    ? rawSearchParams.inviteToken[0]
    : rawSearchParams.inviteToken;
  const temporaryPassword = Array.isArray(rawSearchParams.temporaryPassword)
    ? rawSearchParams.temporaryPassword[0]
    : rawSearchParams.temporaryPassword;
  const ownerEmail = Array.isArray(rawSearchParams.ownerEmail)
    ? rawSearchParams.ownerEmail[0]
    : rawSearchParams.ownerEmail;
  const primaryDomain =
    restaurant.domains.find((domain) => domain.isPrimary)?.domain ??
    restaurant.domains[0]?.domain ??
    `${restaurant.tenant.slug}.platform.test`;
  const publicWebsiteUrl = buildTenantOrigin(primaryDomain);
  const adminUrl = `${publicWebsiteUrl}/extadmin/login`;
  const inviteUrl = inviteToken ? `${publicWebsiteUrl}/extadmin/invite/${inviteToken}` : null;

  return (
    <div className="platform-page-content">
      <PlatformProvisionSuccessView
        restaurant={restaurant}
        setup={setup}
        featureFlags={featureFlags}
        ownerEmail={ownerEmail ?? ownerUser?.email ?? setup.ownerEmail}
        adminUrl={adminUrl}
        publicWebsiteUrl={publicWebsiteUrl}
        inviteUrl={inviteUrl}
        temporaryPassword={temporaryPassword ?? null}
      />
    </div>
  );
}
