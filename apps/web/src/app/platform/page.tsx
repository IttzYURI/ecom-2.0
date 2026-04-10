import { PlatformDashboard } from "../../components/admin";
import { LayoutShell } from "../../components/layout-shell";
import { listTenants, platformMetrics } from "../../lib/mock-data";

export default function PlatformPage() {
  return (
    <LayoutShell
      title="Platform Super Admin"
      subtitle="Tenant lifecycle, support operations, payment governance, and platform-level control."
    >
      <PlatformDashboard metrics={platformMetrics} tenants={listTenants()} />
    </LayoutShell>
  );
}
