import { LayoutShell } from "../../components/layout-shell";
import { ContactPage } from "../../components/storefront";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ContactRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

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
