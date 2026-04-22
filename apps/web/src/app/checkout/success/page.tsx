import Link from "next/link";

import { LayoutShell } from "../../../components/layout-shell";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderNumber = Array.isArray(params.orderNumber) ? params.orderNumber[0] : params.orderNumber;
  const paymentMethod = Array.isArray(params.paymentMethod) ? params.paymentMethod[0] : params.paymentMethod;
  const total = Array.isArray(params.total) ? params.total[0] : params.total;

  return (
    <LayoutShell
      eyebrow="Order confirmed"
      title=" "
      subtitle="The restaurant has received your order and will prepare it shortly."
      showHero={false}
    >
      <section className="checkout-success-shell">
        <div className="panel tone-dark checkout-success-card">
          <div className="checkout-success-badge">
            <span className="checkout-success-mark" aria-hidden="true">
              ✓
            </span>
            <span>{paymentMethod === "card" ? "Card payment complete" : "Cash order received"}</span>
          </div>
          <h2>Your order is confirmed</h2>
          <p>
            {paymentMethod === "card"
              ? "Your payment has been recorded and the restaurant has your order."
              : "Please pay with cash on delivery or when collecting your order from the restaurant."}{" "}
            The kitchen has your order and service will begin shortly.
          </p>
          {orderNumber || total ? (
            <p>
              {orderNumber ? `Order ${orderNumber}` : null}
              {orderNumber && total ? " · " : null}
              {total ? `Total ${total}` : null}
            </p>
          ) : null}
          <div className="actions checkout-success-actions">
            <Link href="/menu" className="button-primary">
              Back to menu
            </Link>
            <Link href="/account/track-orders" className="button-secondary">
              Track orders
            </Link>
          </div>
        </div>
      </section>
    </LayoutShell>
  );
}
