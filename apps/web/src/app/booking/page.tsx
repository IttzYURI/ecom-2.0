import { LayoutShell } from "../../components/layout-shell";
import { BookingPage } from "../../components/storefront";
import { getDefaultTenant } from "../../lib/mock-data";

export default function BookingRoute() {
  return (
    <LayoutShell
      eyebrow="Reservations"
      title="Reservations"
      subtitle="Book directly with the restaurant for lunch, dinner, and special occasions."
    >
      <BookingPage tenantId={getDefaultTenant().id} />
    </LayoutShell>
  );
}
