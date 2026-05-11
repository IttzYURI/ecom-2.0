import { LayoutShell } from "../../components/layout-shell";
import { ContactPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function ContactRoute() {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

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
