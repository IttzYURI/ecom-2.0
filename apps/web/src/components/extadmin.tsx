import type { ReactNode } from "react";

import { formatMoney } from "../lib/currency";
import type { AuditEntry } from "../lib/audit-store";

import type { TenantBundle } from "@rcc/contracts";

export function ExtAdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="page-shell extadmin-shell">
      <section className="panel extadmin-topbar">
        <div>
          <p className="eyebrow">Restaurant Owner Access</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <nav className="extadmin-nav">
          <a href="/extadmin">Dashboard</a>
          <a href="/extadmin/content">Content</a>
          <a href="/extadmin/menu">Menu</a>
          <a href="/extadmin/orders">Orders</a>
          <a href="/extadmin/bookings">Bookings</a>
          <a href="/extadmin/media">Media</a>
          <a href="/extadmin/staff">Staff</a>
          <a href="/extadmin/settings">Settings</a>
          <form action="/api/v1/extadmin/logout" method="post">
            <button type="submit" className="button-ghost compact-button">
              Logout
            </button>
          </form>
        </nav>
      </section>
      {children}
    </main>
  );
}

export function ExtAdminLoginCard({ error }: { error?: string | null }) {
  return (
    <main className="page-shell extadmin-login-shell">
      <section className="panel extadmin-login-card">
        <div>
          <p className="eyebrow">Secure Owner Access</p>
          <h1>Sign in to manage Bella Roma</h1>
          <p>
            Update homepage content, menu items, orders, bookings, and restaurant
            settings without exposing any admin controls to public visitors.
          </p>
        </div>
        <form className="form-grid" method="post" action="/api/v1/extadmin/login">
          <input
            name="email"
            type="email"
            placeholder="owner@bellaroma.test"
            defaultValue="owner@bellaroma.test"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            defaultValue="demo1234"
          />
          <button type="submit" className="button-primary">
            Login to owner portal
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export function ExtAdminDashboard({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack">
      <div className="stat-grid">
        <article className="panel">
          <p className="eyebrow">Live menu items</p>
          <h2>{bundle.menuItems.filter((item) => item.available).length}</h2>
        </article>
        <article className="panel">
          <p className="eyebrow">Orders today</p>
          <h2>{bundle.orders.length}</h2>
        </article>
        <article className="panel">
          <p className="eyebrow">Pending bookings</p>
          <h2>{bundle.bookings.filter((booking) => booking.status === "pending").length}</h2>
        </article>
        <article className="panel">
          <p className="eyebrow">Team accounts</p>
          <h2>{bundle.staff.length}</h2>
        </article>
      </div>

      <div className="content-grid">
        <article className="panel">
          <h2>Website control</h2>
          <ul className="plain-list">
            <li><strong>Homepage content</strong><span>Hero, featured dishes, gallery, reviews, FAQ</span></li>
            <li><strong>Menu management</strong><span>Categories, items, pricing, visibility, modifiers</span></li>
            <li><strong>Service settings</strong><span>Contact details, booking flow, delivery coverage</span></li>
          </ul>
        </article>
        <article className="panel">
          <h2>Latest orders</h2>
          <ul className="plain-list">
            {bundle.orders.map((order) => (
              <li key={order.id}>
                <strong>{order.orderNumber} | {order.customerName}</strong>
                <span>{order.orderStatus} | {formatMoney(order.total)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export function ExtAdminContentPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Homepage content</h2>
        <form className="form-grid" method="post" action="/api/v1/extadmin/content">
          <input type="hidden" name="tenantId" value={bundle.tenant.id} />
          <div>
            <p className="eyebrow">Hero title</p>
            <input name="heroTitle" defaultValue={bundle.content.heroTitle} />
          </div>
          <div>
            <p className="eyebrow">Hero subtitle</p>
            <textarea name="heroSubtitle" rows={3} defaultValue={bundle.content.heroSubtitle} />
          </div>
          <div>
            <p className="eyebrow">About section</p>
            <textarea name="about" rows={5} defaultValue={bundle.content.about} />
          </div>
          <div className="content-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`gallery-image-${index}`}>
                <p className="eyebrow">Gallery image {index + 1}</p>
                <input
                  name={`galleryImage_${index}`}
                  defaultValue={bundle.content.galleryImages?.[index] ?? ""}
                />
              </div>
            ))}
          </div>
          <div className="content-grid">
            <div>
              <p className="eyebrow">FAQ question 1</p>
              <input name="faqQuestion1" defaultValue={bundle.content.faq[0]?.question ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ answer 1</p>
              <textarea name="faqAnswer1" rows={4} defaultValue={bundle.content.faq[0]?.answer ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ question 2</p>
              <input name="faqQuestion2" defaultValue={bundle.content.faq[1]?.question ?? ""} />
            </div>
            <div>
              <p className="eyebrow">FAQ answer 2</p>
              <textarea name="faqAnswer2" rows={4} defaultValue={bundle.content.faq[1]?.answer ?? ""} />
            </div>
          </div>
          <button type="submit" className="button-primary">
            Save public website content
          </button>
        </form>
      </article>
      <article className="panel">
        <h2>Reviews and testimonials</h2>
        <form className="form-grid" method="post" action="/api/v1/extadmin/reviews">
          <input type="hidden" name="tenantId" value={bundle.tenant.id} />
          {Array.from({ length: Math.max(bundle.reviews.length, 4) }, (_, index) => {
            const review = bundle.reviews[index];

            return (
              <section key={review?.id ?? `review-slot-${index}`} className="panel">
                <input
                  type="hidden"
                  name={`reviewId_${index}`}
                  value={review?.id ?? `review_${index + 1}`}
                />
                <div className="content-grid">
                  <div>
                    <p className="eyebrow">Author</p>
                    <input
                      name={`reviewAuthor_${index}`}
                      defaultValue={review?.author ?? ""}
                    />
                  </div>
                  <div>
                    <p className="eyebrow">Rating</p>
                    <input
                      name={`reviewRating_${index}`}
                      type="number"
                      min="1"
                      max="5"
                      defaultValue={review?.rating ?? 5}
                    />
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Review text</p>
                  <textarea
                    name={`reviewContent_${index}`}
                    rows={4}
                    defaultValue={review?.content ?? ""}
                  />
                </div>
              </section>
            );
          })}
          <button type="submit" className="button-primary">
            Save reviews
          </button>
        </form>
      </article>
      <article className="panel">
        <h2>Editable public sections</h2>
        <ul className="plain-list">
          <li><strong>Hero and CTA areas</strong><span>Change the first impression customers see</span></li>
          <li><strong>Featured dishes</strong><span>Control which items are promoted on the homepage</span></li>
          <li><strong>Gallery, reviews, FAQ</strong><span>Curate trust, atmosphere, and guest confidence sections</span></li>
        </ul>
      </article>
    </section>
  );
}

export function ExtAdminMenuPage({
  bundle,
  menu
}: {
  bundle: TenantBundle;
  menu: {
    categories: TenantBundle["categories"];
    menuItems: TenantBundle["menuItems"];
  };
}) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Menu editor</h2>
        <div className="content-grid">
          <section className="panel">
            <h3>Add category</h3>
            <form className="form-grid" method="post" action="/api/v1/extadmin/menu/categories/create">
              <input type="hidden" name="tenantId" value={bundle.tenant.id} />
              <input name="name" placeholder="Category name" />
              <input name="slug" placeholder="category-slug" />
              <input name="description" placeholder="Short category description" />
              <label className="choice-card">
                <input type="checkbox" name="visible" defaultChecked />
                <span>Visible on public menu</span>
              </label>
              <button type="submit" className="button-primary">
                Add category
              </button>
            </form>
          </section>
          <section className="panel">
            <h3>Add menu item</h3>
            <form className="form-grid" method="post" action="/api/v1/extadmin/menu/items/create">
              <input type="hidden" name="tenantId" value={bundle.tenant.id} />
              <input name="name" placeholder="Dish name" />
              <input name="slug" placeholder="dish-slug" />
              <input name="image" placeholder="Image URL" />
              <input name="basePrice" type="number" step="0.1" placeholder="Price" />
              <select name="categoryId" defaultValue={menu.categories[0]?.id}>
                {menu.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <textarea name="description" rows={3} placeholder="Short dish description" />
              <div className="content-grid">
                <label className="choice-card">
                  <input type="checkbox" name="available" defaultChecked />
                  <span>Available now</span>
                </label>
                <label className="choice-card">
                  <input type="checkbox" name="featured" />
                  <span>Feature on homepage</span>
                </label>
                <label className="choice-card">
                  <input type="checkbox" name="bestSeller" />
                  <span>Best seller tag</span>
                </label>
              </div>
              <button type="submit" className="button-primary">
                Add item
              </button>
            </form>
          </section>
        </div>
        <form className="form-grid" method="post" action="/api/v1/extadmin/menu">
          <input type="hidden" name="tenantId" value={bundle.tenant.id} />
          <div className="stack">
            {menu.categories.map((category, index) => (
              <section key={category.id} className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Category block</p>
                    <h3>{category.name}</h3>
                  </div>
                  <div>
                    <button
                      type="submit"
                      formAction="/api/v1/extadmin/menu/categories/delete"
                      formMethod="post"
                      name="categoryId"
                      value={category.id}
                      className="button-ghost compact-button"
                    >
                      Delete category
                    </button>
                  </div>
                </div>
                <input type="hidden" name={`categoryId_${index}`} value={category.id} />
                <div className="content-grid">
                  <div>
                    <p className="eyebrow">Category name</p>
                    <input name={`categoryName_${index}`} defaultValue={category.name} />
                  </div>
                  <div>
                    <p className="eyebrow">Slug</p>
                    <input name={`categorySlug_${index}`} defaultValue={category.slug} />
                  </div>
                  <div>
                    <p className="eyebrow">Description</p>
                    <input
                      name={`categoryDescription_${index}`}
                      defaultValue={category.description}
                    />
                  </div>
                  <label className="choice-card">
                    <input
                      type="checkbox"
                      name={`categoryVisible_${index}`}
                      defaultChecked={category.visible}
                    />
                    <span>Visible on public menu</span>
                  </label>
                </div>
              </section>
            ))}
          </div>

          <div className="stack">
            {menu.menuItems.map((item, index) => (
              <section key={item.id} className="panel">
                <input type="hidden" name={`itemId_${index}`} value={item.id} />
                <div className="content-grid">
                  <div>
                    <p className="eyebrow">Item name</p>
                    <input name={`itemName_${index}`} defaultValue={item.name} />
                  </div>
                  <div>
                    <p className="eyebrow">Slug</p>
                    <input name={`itemSlug_${index}`} defaultValue={item.slug} />
                  </div>
                  <div>
                    <p className="eyebrow">Price</p>
                    <input
                      name={`itemPrice_${index}`}
                      type="number"
                      step="0.1"
                      defaultValue={item.basePrice}
                    />
                  </div>
                  <div>
                    <p className="eyebrow">Image URL</p>
                    <input name={`itemImage_${index}`} defaultValue={item.image} />
                  </div>
                  <div>
                    <p className="eyebrow">Primary category</p>
                    <select
                      name={`itemCategoryId_${index}`}
                      defaultValue={item.categoryIds[0] ?? menu.categories[0]?.id}
                    >
                      {menu.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="content-grid">
                    <label className="choice-card">
                      <input
                        type="checkbox"
                        name={`itemAvailable_${index}`}
                        defaultChecked={item.available}
                      />
                      <span>Available now</span>
                    </label>
                    <label className="choice-card">
                      <input
                        type="checkbox"
                        name={`itemFeatured_${index}`}
                        defaultChecked={item.featured}
                      />
                      <span>Featured on homepage</span>
                    </label>
                    <label className="choice-card">
                      <input
                        type="checkbox"
                        name={`itemBestSeller_${index}`}
                        defaultChecked={item.bestSeller}
                      />
                      <span>Best seller label</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Description</p>
                  <textarea
                    name={`itemDescription_${index}`}
                    rows={4}
                    defaultValue={item.description}
                  />
                </div>
                <div className="section-heading">
                  <span className="eyebrow">Remove item if no longer offered</span>
                  <button
                    type="submit"
                    formAction="/api/v1/extadmin/menu/items/delete"
                    formMethod="post"
                    name="itemId"
                    value={item.id}
                    className="button-ghost compact-button"
                  >
                    Delete item
                  </button>
                </div>
              </section>
            ))}
          </div>

          <button type="submit" className="button-primary">
            Save menu changes
          </button>
        </form>
      </article>
    </section>
  );
}

export function ExtAdminOrdersPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="panel">
      <h2>Order queue</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Fulfilment</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {bundle.orders.map((order) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>{order.customerName}</td>
              <td>{order.fulfillmentType}</td>
              <td>
                <form method="post" action="/api/v1/extadmin/orders/status" className="inline-status-form">
                  <input type="hidden" name="tenantId" value={bundle.tenant.id} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <select name="orderStatus" defaultValue={order.orderStatus}>
                    <option value="pending_payment">Pending payment</option>
                    <option value="placed">Placed</option>
                    <option value="accepted">Accepted</option>
                    <option value="preparing">Preparing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <button type="submit" className="button-ghost compact-button">
                    Save
                  </button>
                </form>
              </td>
              <td>{formatMoney(order.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ExtAdminBookingsPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="panel">
      <h2>Booking requests</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Date</th>
            <th>Time</th>
            <th>Party</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bundle.bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.customerName}</td>
              <td>{booking.bookingDate}</td>
              <td>{booking.bookingTime}</td>
              <td>{booking.partySize}</td>
              <td>
                <form method="post" action="/api/v1/extadmin/bookings/status" className="inline-status-form">
                  <input type="hidden" name="tenantId" value={bundle.tenant.id} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <select name="status" defaultValue={booking.status}>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="submit" className="button-ghost compact-button">
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ExtAdminSettingsPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Business settings</h2>
        <form className="form-grid" method="post" action="/api/v1/extadmin/settings">
          <input type="hidden" name="tenantId" value={bundle.tenant.id} />
          <div className="content-grid">
            <div>
              <p className="eyebrow">Restaurant name</p>
              <input name="name" defaultValue={bundle.tenant.name} />
            </div>
            <div>
              <p className="eyebrow">Cuisine</p>
              <input name="cuisine" defaultValue={bundle.tenant.cuisine} />
            </div>
            <div>
              <p className="eyebrow">Phone</p>
              <input name="phone" defaultValue={bundle.tenant.phone} />
            </div>
            <div>
              <p className="eyebrow">Email</p>
              <input name="email" defaultValue={bundle.tenant.email} />
            </div>
          </div>
          <div>
            <p className="eyebrow">Address</p>
            <input name="address" defaultValue={bundle.tenant.address} />
          </div>
          <div>
            <p className="eyebrow">Business description</p>
            <textarea name="description" rows={4} defaultValue={bundle.tenant.description} />
          </div>
          <div>
            <p className="eyebrow">Delivery postcodes</p>
            <textarea
              name="deliveryPostcodes"
              rows={4}
              defaultValue={bundle.tenant.deliveryPostcodes.join(", ")}
            />
          </div>
          <button type="submit" className="button-primary">
            Save restaurant settings
          </button>
        </form>
      </article>
      <article className="panel">
        <h2>Current delivery coverage</h2>
        <ul className="plain-list">
          {bundle.tenant.deliveryPostcodes.map((postcode) => (
            <li key={postcode}>
              <strong>{postcode}</strong>
              <span>Delivery enabled</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function ExtAdminStaffPage({
  bundle,
  auditEntries,
  status,
  message
}: {
  bundle: TenantBundle;
  auditEntries: AuditEntry[];
  status?: string;
  message?: string;
}) {
  return (
    <section className="stack">
      {message ? (
        <article className={`panel ${status === "error" ? "notice-error" : "notice-success"}`}>
          <strong>{status === "error" ? "Could not complete that action." : "Saved."}</strong>
          <p>{message}</p>
        </article>
      ) : null}
      <article className="panel">
        <h2>Team access</h2>
        <div className="content-grid">
          <section className="panel">
            <h3>Create staff account</h3>
            <form className="form-grid" method="post" action="/api/v1/extadmin/staff/create">
              <input type="hidden" name="tenantId" value={bundle.tenant.id} />
              <input name="name" placeholder="Full name" />
              <input name="email" type="email" placeholder="staff@bellaroma.test" />
              <input name="password" type="password" placeholder="Temporary password" />
              <select name="roleId" defaultValue={bundle.roles[0]?.id}>
                {bundle.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="button-primary">
                Create staff account
              </button>
            </form>
          </section>
          <section className="panel">
            <h3>Default login notes</h3>
            <ul className="plain-list">
              <li><strong>Owner login</strong><span>Configured from env or seeded into Mongo automatically</span></li>
              <li><strong>Staff accounts</strong><span>Created here and can be reassigned or reset without code changes</span></li>
              <li><strong>Access control</strong><span>Role assignment is persisted with each admin account</span></li>
              <li><strong>Validation</strong><span>Duplicate emails and weak passwords are blocked server-side</span></li>
            </ul>
          </section>
        </div>
      </article>

      <article className="panel">
        <h2>Existing team members</h2>
        <div className="stack">
          {bundle.staff.map((member) => (
            <section key={member.id} className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Staff account</p>
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                </div>
                <form method="post" action="/api/v1/extadmin/staff/delete">
                  <input type="hidden" name="tenantId" value={bundle.tenant.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <button type="submit" className="button-ghost compact-button">
                    Remove access
                  </button>
                </form>
              </div>

              <div className="content-grid">
                <form className="form-grid" method="post" action="/api/v1/extadmin/staff/role">
                  <input type="hidden" name="tenantId" value={bundle.tenant.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <p className="eyebrow">Assigned role</p>
                  <select name="roleId" defaultValue={member.roleIds[0] ?? bundle.roles[0]?.id}>
                    {bundle.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button-ghost compact-button">
                    Save role
                  </button>
                </form>

                <form className="form-grid" method="post" action="/api/v1/extadmin/staff/password">
                  <input type="hidden" name="tenantId" value={bundle.tenant.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <p className="eyebrow">Reset password</p>
                  <input name="password" type="password" placeholder="New password" />
                  <button type="submit" className="button-ghost compact-button">
                    Update password
                  </button>
                </form>
              </div>
            </section>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Recent access activity</h2>
        <ul className="plain-list">
          {auditEntries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.summary}</strong>
              <span>{entry.actorEmail} | {new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function ExtAdminMediaPage({
  assets
}: {
  assets: Array<{
    id: string;
    label: string;
    url: string;
    kind: string;
    createdAt: string;
  }>;
}) {
  return (
    <section className="stack">
      <article className="panel">
        <h2>Media library</h2>
        <div className="content-grid">
          <section className="panel">
            <h3>Add media asset</h3>
            <form className="form-grid" method="post" action="/api/v1/extadmin/media/create">
              <input type="hidden" name="tenantId" value="tenant_bella" />
              <input name="label" placeholder="Asset label" />
              <input name="url" placeholder="https://..." />
              <select name="kind" defaultValue="gallery">
                <option value="gallery">Gallery</option>
                <option value="hero">Hero</option>
                <option value="general">General</option>
              </select>
              <button type="submit" className="button-primary">
                Save asset
              </button>
            </form>
          </section>
          <section className="panel">
            <h3>Usage</h3>
            <ul className="plain-list">
              <li><strong>Gallery assets</strong><span>Keep reusable image URLs in one owner-managed library</span></li>
              <li><strong>Hero assets</strong><span>Store preferred visuals before assigning them in content settings</span></li>
              <li><strong>General assets</strong><span>Maintain a shared pool of approved image URLs for the site</span></li>
            </ul>
          </section>
        </div>
      </article>
      <article className="panel">
        <h2>Saved assets</h2>
        <div className="stack">
          {assets.length ? (
            assets.map((asset) => (
              <section key={asset.id} className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{asset.kind}</p>
                    <h3>{asset.label}</h3>
                    <p>{asset.url}</p>
                  </div>
                  <form method="post" action="/api/v1/extadmin/media/delete">
                    <input type="hidden" name="tenantId" value="tenant_bella" />
                    <input type="hidden" name="assetId" value={asset.id} />
                    <button type="submit" className="button-ghost compact-button">
                      Delete asset
                    </button>
                  </form>
                </div>
              </section>
            ))
          ) : (
            <p>No media assets saved yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}
