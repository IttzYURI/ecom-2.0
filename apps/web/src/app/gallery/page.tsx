import { LayoutShell } from "../../components/layout-shell";
import { GalleryPage } from "../../components/storefront";
import { getRuntimeTenantBundle } from "../../lib/content-store";
import { getDefaultTenant } from "../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function GalleryRoute() {
  const bundle = await getRuntimeTenantBundle(getDefaultTenant().id);

  return (
    <LayoutShell
      eyebrow="Inside Bella Roma"
      title="Gallery"
      subtitle="A feel for the space, the energy, and the plates before guests even arrive."
    >
      <GalleryPage bundle={bundle} />
    </LayoutShell>
  );
}
