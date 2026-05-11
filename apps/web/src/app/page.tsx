import { StorefrontHome } from "../components/storefront";
import { TenantUnavailablePage } from "../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../lib/tenant";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <main className="page-shell home-shell">
      <StorefrontHome bundle={bundle} />
    </main>
  );
}
