import { notFound } from "next/navigation";

import { DeliveryTrackingView } from "../../../components/delivery-tracking-view";
import { LayoutShell } from "../../../components/layout-shell";
import { TenantUnavailablePage } from "../../../components/tenant-unavailable";
import { getStoredOrderByTrackingToken } from "../../../lib/operations-store";
import { resolvePublicTenantBundle } from "../../../lib/tenant";
import { serializeOrderTracking } from "../../../lib/tracking-view";

export const dynamic = "force-dynamic";

export default async function PublicTrackingRoute({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { bundle, status } = await resolvePublicTenantBundle();

  if (status !== "active") {
    return <TenantUnavailablePage status={status} />;
  }

  const { token } = await params;
  const order = await getStoredOrderByTrackingToken(bundle.tenant.id, token);

  if (!order?.deliveryTracking) {
    notFound();
  }

  return (
    <LayoutShell
      eyebrow="Delivery tracking"
      title="Follow your order"
      subtitle="This secure tracking page stays available even if you checked out without logging in."
    >
      <DeliveryTrackingView initialOrders={[serializeOrderTracking(order)]} mode="public" />
    </LayoutShell>
  );
}
