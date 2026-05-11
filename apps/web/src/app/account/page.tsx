import { redirect } from "next/navigation";

import { CustomerDashboardPage } from "../../components/customer-dashboard-page";
import { LayoutShell } from "../../components/layout-shell";
import { getCustomerSessionFromCookieStore } from "../../lib/customer-auth";
import { getStoredActiveCustomerOrder, getStoredCustomerOrders } from "../../lib/operations-store";

export default async function AccountRoute() {
  const session = await getCustomerSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  const orders = await getStoredCustomerOrders(session.tenantId, session.email);
  const activeOrder = await getStoredActiveCustomerOrder(session.tenantId, session.email);

  return (
    <LayoutShell
      eyebrow="Customer account"
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
