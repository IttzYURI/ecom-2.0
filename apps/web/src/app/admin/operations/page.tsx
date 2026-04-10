import { TenantOperationsPage } from "../../../components/admin";
import { LayoutShell } from "../../../components/layout-shell";
import { getDefaultTenant, getTenantBundle } from "../../../lib/mock-data";

export default function AdminOperationsPage() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      title="Operations"
      subtitle="Bookings, staff, and permissions represent the tenant-side operating surface."
    >
      <TenantOperationsPage bundle={bundle} />
    </LayoutShell>
  );
}
