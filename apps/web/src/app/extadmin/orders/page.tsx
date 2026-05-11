import { redirect } from "next/navigation";

import { ExtAdminOrdersLiveRefresh } from "../../../components/extadmin-orders-live-refresh";
import { ExtAdminOrdersPage, ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";
import { getOrdersWithPrintState } from "../../../lib/printing-service";

export const dynamic = "force-dynamic";

export default async function ExtAdminOrdersRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const tenantId = session.tenantId;
  const bundle = await getRuntimeTenantBundleWithOperations(tenantId);
  const orders = await getOrdersWithPrintState(tenantId, bundle.orders);

  return (
    <ExtAdminShell
      title="Order Management"
      subtitle="Track active orders, watch fulfilment progress, and keep service moving smoothly."
    >
      <ExtAdminOrdersLiveRefresh />
      <ExtAdminOrdersPage bundle={{ ...bundle, orders }} />
    </ExtAdminShell>
  );
}
