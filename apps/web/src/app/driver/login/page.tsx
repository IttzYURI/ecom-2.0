import { LayoutShell } from "../../../components/layout-shell";
import { getStoredDrivers } from "../../../lib/driver-store";
import { getDefaultTenant } from "../../../lib/mock-data";

export default async function DriverLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const drivers = (await getStoredDrivers(getDefaultTenant().id)).filter((driver) => driver.active);

  return (
    <LayoutShell
      eyebrow="Driver access"
      title="Driver console login"
      subtitle="Use your assigned phone number to open the active delivery console."
    >
      <section className="panel">
        <form className="form-grid" action="/api/v1/driver/login" method="post">
          <input type="hidden" name="tenantId" value={getDefaultTenant().id} />
          <select name="driverId" defaultValue={drivers[0]?.id}>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} | {driver.vehicleLabel}
              </option>
            ))}
          </select>
          <input name="phone" placeholder="Phone number" />
          <button type="submit" className="button-primary">Open driver console</button>
          {error ? <p className="form-error">Driver login failed. Check the selected driver and phone number.</p> : null}
        </form>
      </section>
    </LayoutShell>
  );
}
