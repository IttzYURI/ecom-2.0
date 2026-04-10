import { CheckoutPageContent } from "../../components/storefront";
import { LayoutShell } from "../../components/layout-shell";

export default function CheckoutRoute() {
  return (
    <LayoutShell
      eyebrow="Checkout"
      title="Checkout"
      subtitle="Delivery details, payment choice, and final confirmation all happen here."
    >
      <CheckoutPageContent />
    </LayoutShell>
  );
}
