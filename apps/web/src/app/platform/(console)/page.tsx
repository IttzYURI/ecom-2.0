import { PlatformOverview } from "../../../components/platform-admin";
import { PlatformAdminService } from "../../../lib/platform-admin-service";

export const dynamic = "force-dynamic";

export default async function PlatformPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [dashboard, rawSearchParams] = await Promise.all([
    new PlatformAdminService().getDashboardData(),
    searchParams
  ]);
  const status = Array.isArray(rawSearchParams.status) ? rawSearchParams.status[0] : rawSearchParams.status;
  const message = Array.isArray(rawSearchParams.message) ? rawSearchParams.message[0] : rawSearchParams.message;

  return (
    <div className="platform-page-content">
      <section className="platform-page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Platform Overview</h1>
          <p>Tenant lifecycle, support operations, payment governance, and platform-level control.</p>
        </div>
      </section>
      <PlatformOverview dashboard={dashboard} status={status} message={message} />
    </div>
  );
}
