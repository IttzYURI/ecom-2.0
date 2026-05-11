import { redirect } from "next/navigation";

import { ExtAdminMediaPage, ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getStoredMediaAssets } from "../../../lib/media-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminMediaRoute() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const tenantId = session.tenantId;
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
