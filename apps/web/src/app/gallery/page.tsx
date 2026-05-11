import { FeatureGate } from "../../components/feature-gate";
import { LayoutShell } from "../../components/layout-shell";
import { GalleryPage } from "../../components/storefront";
import { TenantUnavailablePage } from "../../components/tenant-unavailable";
import { resolvePublicTenantBundle } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function GalleryRoute() {
  const { bundle, status, features } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  return (
    <FeatureGate features={features} flag="gallery">
      <LayoutShell
        eyebrow="Gallery"
        title="Gallery"
        subtitle="A feel for the space, the energy, and the plates before guests even arrive."
      >
        <GalleryPage bundle={bundle} />
      </LayoutShell>
    </FeatureGate>
  );
}
