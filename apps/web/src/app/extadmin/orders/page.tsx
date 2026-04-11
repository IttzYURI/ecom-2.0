import { ExtAdminOrdersPage, ExtAdminShell } from "../../../components/extadmin";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminOrdersRoute() {
  const bundle = await getRuntimeTenantBundleWithOperations(getDefaultTenant().id);

  return (
    <ExtAdminShell
      title="Order Management"
      subtitle="Track active orders, watch fulfilment progress, and keep service moving smoothly."
    >
      <ExtAdminOrdersPage bundle={bundle} />
    </ExtAdminShell>
  );
}
