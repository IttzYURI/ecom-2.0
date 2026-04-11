import { ExtAdminMediaPage, ExtAdminShell } from "../../../components/extadmin";
import { getStoredMediaAssets } from "../../../lib/media-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ExtAdminMediaRoute() {
  const tenantId = getDefaultTenant().id;
  const assets = await getStoredMediaAssets(tenantId);

  return (
    <ExtAdminShell
      title="Media Library"
      subtitle="Store reusable image assets for homepage visuals, gallery sections, and future campaign content."
    >
      <ExtAdminMediaPage assets={assets} />
    </ExtAdminShell>
  );
}
