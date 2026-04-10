import { TenantAdminDashboard } from "../../components/admin";
import { LayoutShell } from "../../components/layout-shell";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function AdminPage() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      title={`${bundle.tenant.name} Admin`}
      subtitle="Restaurant operations dashboard for orders, settings, content, menu, and staffing."
    >
      <TenantAdminDashboard bundle={bundle} />
    </LayoutShell>
  );
}
