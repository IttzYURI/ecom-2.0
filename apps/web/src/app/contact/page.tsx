import { LayoutShell } from "../../components/layout-shell";
import { ContactPage } from "../../components/storefront";
import { getDefaultTenant, getTenantBundle } from "../../lib/mock-data";

export default function ContactRoute() {
  const bundle = getTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      eyebrow="Get in touch"
      title="Contact and FAQ"
      subtitle="Speak to the team directly about bookings, allergen questions, or delivery enquiries."
    >
      <ContactPage bundle={bundle} />
    </LayoutShell>
  );
}
