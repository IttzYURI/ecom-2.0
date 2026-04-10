import { StorefrontHome } from "../components/storefront";
import { getTenantBundle, getDefaultTenant } from "../lib/mock-data";

export default function HomePage() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <main className="page-shell home-shell">
      <StorefrontHome bundle={bundle} />
    </main>
  );
}
