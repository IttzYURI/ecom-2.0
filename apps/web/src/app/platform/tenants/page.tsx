import { LayoutShell } from "../../../components/layout-shell";
import { listTenants } from "../../../lib/mock-data";

export default function PlatformTenantsPage() {
  const tenants = listTenants();

  return (
    <LayoutShell
      title="Tenant Directory"
      subtitle="Create, activate, suspend, and inspect every restaurant tenant from one control plane."
    >
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>{tenant.slug}</td>
                <td>{tenant.status}</td>
                <td>{tenant.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </LayoutShell>
  );
}
