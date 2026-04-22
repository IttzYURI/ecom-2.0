import { CustomerInformationPage } from "../../components/customer-information-page";
import { LayoutShell } from "../../components/layout-shell";

export default function CustomerInformationRoute() {
  return (
    <LayoutShell
      eyebrow="Checkout step"
      title="Customer information"
      subtitle="Add your contact details before completing the order."
    >
      <CustomerInformationPage />
    </LayoutShell>
  );
}
