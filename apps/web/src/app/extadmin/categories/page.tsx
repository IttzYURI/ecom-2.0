import { redirect } from "next/navigation";

import { ExtAdminShell } from "../../../components/extadmin";
import { getExtAdminSessionFromCookieStore } from "../../../lib/extadmin-auth";
import { getRuntimeTenantBundleWithOperations } from "../../../lib/operations-store";

export const dynamic = "force-dynamic";

export default async function ExtAdminCategoriesPage() {
  const session = await getExtAdminSessionFromCookieStore();

  if (!session) {
    redirect("/extadmin/login");
  }

  const bundle = await getRuntimeTenantBundleWithOperations(session.tenantId);

  return (
    <ExtAdminShell title="Categories" subtitle="Organise menu sections, reorder categories, and control visibility on the public storefront.">
      <section className="admin-page-stack">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <div>
              <p className="eyebrow">Catalog structure</p>
              <h3>Menu categories</h3>
              <p>These categories group menu items for the public storefront. Add new categories from the Menu page.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Items</th>
                  <th>Visible</th>
                  <th>Sort order</th>
                </tr>
              </thead>
              <tbody>
                {bundle.categories.map((category) => (
                  <tr key={category.id}>
                    <td data-label="Name"><strong>{category.name}</strong></td>
                    <td data-label="Slug">{category.slug}</td>
                    <td data-label="Items">{bundle.menuItems.filter((item) => item.categoryIds.includes(category.id)).length}</td>
                    <td data-label="Visible">
                      <span className={`admin-badge ${category.visible ? "success" : "danger"}`}>
                        {category.visible ? "Yes" : "Hidden"}
                      </span>
                    </td>
                    <td data-label="Sort">{category.sortOrder}</td>
                  </tr>
                ))}
                {!bundle.categories.length ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">No categories created yet. Add them from the Menu editor.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </ExtAdminShell>
  );
}
