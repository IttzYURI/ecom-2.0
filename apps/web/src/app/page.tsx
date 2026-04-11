import { StorefrontHome } from "../components/storefront";
import { getRuntimeTenantBundle } from "../lib/content-store";
import { getDefaultTenant } from "../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <main className="page-shell home-shell">
      <StorefrontHome bundle={bundle} />
    </main>
  );
}
