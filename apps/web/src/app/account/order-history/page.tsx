import Link from "next/link";
import { redirect } from "next/navigation";

import { LayoutShell } from "../../../components/layout-shell";
import { OrderHistoryList } from "../../../components/order-history-list";
import { getCustomerSessionFromCookieStore } from "../../../lib/customer-auth";
import { getStoredCustomerOrders } from "../../../lib/operations-store";

export default async function AccountOrderHistoryRoute() {
  const session = await getCustomerSessionFromCookieStore();

  if (!session) {
    redirect("/login");
  }

  const orders = await getStoredCustomerOrders(session.tenantId, session.email);

  return (
    <LayoutShell
      eyebrow="Customer account"
      title="Order history"
      subtitle="See every order in a compact list and open any row for full details."
    >
      <section className="stack-xl">
        {orders.length ? (
          <OrderHistoryList orders={orders} />
        ) : (
          <section className="panel">
            <p className="eyebrow">No previous orders</p>
            <h2>Your history is empty</h2>
            <p>Once you complete an order, it will appear here automatically.</p>
            <Link href="/menu" className="button-primary">Browse menu</Link>
          </section>
        )}
      </section>
    </LayoutShell>
  );
}
