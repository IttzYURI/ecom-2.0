import { redirect } from "next/navigation";

import { DriverConsole } from "../../components/driver-console";
import { LayoutShell } from "../../components/layout-shell";
import { getDriverSessionFromCookieStore } from "../../lib/driver-auth";
import { getStoredDrivers } from "../../lib/driver-store";
import { getStoredOperationsContent } from "../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const session = await getDriverSessionFromCookieStore();

  if (!session) {
    redirect("/driver/login");
  }

  const driver = (await getStoredDrivers(session.tenantId)).find((entry) => entry.id === session.driverId);
  const operations = await getStoredOperationsContent(session.tenantId);

  if (!driver) {
    redirect("/driver/login");
  }

  return (
    <LayoutShell
      eyebrow="Driver app"
      title="Delivery console"
      subtitle="Accept assignments, share approximate live location, and keep milestones current."
    >
      <DriverConsole driver={driver} orders={operations.orders} />
    </LayoutShell>
  );
}
