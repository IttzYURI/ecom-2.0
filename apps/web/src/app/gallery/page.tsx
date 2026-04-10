import { LayoutShell } from "../../components/layout-shell";
import { GalleryPage } from "../../components/storefront";

export default function GalleryRoute() {
  return (
    <LayoutShell
      eyebrow="Inside Bella Roma"
      title="Gallery"
      subtitle="A feel for the space, the energy, and the plates before guests even arrive."
    >
      <GalleryPage />
    </LayoutShell>
  );
}
