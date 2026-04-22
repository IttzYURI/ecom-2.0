import { redirect } from "next/navigation";

import { CustomerDashboardPage } from "../../components/customer-dashboard-page";
import { LayoutShell } from "../../components/layout-shell";
import { getCustomerSessionFromCookieStore } from "../../lib/customer-auth";
import { getDefaultTenant } from "../../lib/mock-data";
import { getStoredActiveCustomerOrder, getStoredCustomerOrders } from "../../lib/operations-store";

export default async function AccountRoute() {
  const session = await getCustomerSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  const tenantId = getDefaultTenant().id;
  const orders = await getStoredCustomerOrders(tenantId, session.email);
  const activeOrder = await getStoredActiveCustomerOrder(tenantId, session.email);

  return (
    <LayoutShell
      eyebrow="Customer account"
      title=" "
      subtitle=" "
      showHero={false}
    >
      <CustomerDashboardPage
        session={session}
        activeOrder={activeOrder}
        recentOrders={orders.slice(0, 5)}
      />
    </LayoutShell>
  );
}
