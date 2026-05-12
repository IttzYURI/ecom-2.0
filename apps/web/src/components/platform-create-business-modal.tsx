"use client";

import { useState } from "react";

const BUSINESS_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "pizzeria", label: "Pizzeria" },
  { value: "cafe", label: "Cafe" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "takeaway", label: "Takeaway" },
  { value: "ghost_kitchen", label: "Ghost Kitchen" }
];

const THEME_OPTIONS = [
  { value: "sunset", label: "Sunset" },
  { value: "forest", label: "Forest" },
  { value: "midnight", label: "Midnight" },
  { value: "minimal", label: "Minimal" }
];

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" }
];

export function CreateBusinessModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="button-primary" onClick={() => setOpen(true)}>
        Create Business
      </button>

      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Onboarding</p>
                <h2>Create new business</h2>
                <p>Provision tenant, owner access, launch settings, website defaults, menu skeleton, printer config, and audit trail.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <form
                className="form-grid platform-form-grid platform-provision-form"
                action="/api/v1/platform/tenants"
                method="post"
                encType="multipart/form-data"
              >
                <section className="platform-form-section">
                  <div className="platform-form-section-copy">
                    <p className="eyebrow">Restaurant details</p>
                    <h3>Business profile</h3>
                    <p>Base identity, contacts, address, and brand defaults.</p>
                  </div>
                  <div className="platform-form-section-grid">
                    <label className="platform-field">
                      <span>Business name</span>
                      <input name="businessName" placeholder="North Wharf Kitchen" required />
                    </label>
                    <label className="platform-field">
                      <span>Business type</span>
                      <select name="businessType" defaultValue="restaurant">
                        {BUSINESS_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="platform-field">
                      <span>Email</span>
                      <input name="email" type="email" placeholder="ops@northwharf.com" required />
                    </label>
                    <label className="platform-field">
                      <span>Phone</span>
                      <input name="phone" placeholder="+44 20 7000 0000" />
                    </label>
                    <label className="platform-field platform-field-full">
                      <span>Address</span>
                      <textarea name="address" rows={3} placeholder="1 River Walk" />
                    </label>
                    <label className="platform-field">
                      <span>Postcode</span>
                      <input name="postcode" placeholder="E14 9AB" />
                    </label>
                    <label className="platform-field">
                      <span>Logo optional</span>
                      <input name="logo" type="file" accept="image/*" />
                    </label>
                    <label className="platform-field">
                      <span>Default currency</span>
                      <select name="defaultCurrency" defaultValue="GBP">
                        {CURRENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="platform-field">
                      <span>Timezone</span>
                      <input name="timezone" defaultValue="Europe/London" />
                    </label>
                  </div>
                </section>

                <section className="platform-form-section">
                  <div className="platform-form-section-copy">
                    <p className="eyebrow">Owner account</p>
                    <h3>First owner access</h3>
                    <p>Create owner user with temp password or invite link.</p>
                  </div>
                  <div className="platform-form-section-grid">
                    <label className="platform-field">
                      <span>Owner name</span>
                      <input name="ownerName" placeholder="Alex Morgan" required />
                    </label>
                    <label className="platform-field">
                      <span>Owner email</span>
                      <input name="ownerEmail" type="email" placeholder="owner@northwharf.com" required />
                    </label>
                    <label className="platform-field">
                      <span>Access mode</span>
                      <select name="ownerAccessMode" defaultValue="temporary_password">
                        <option value="temporary_password">Temporary password</option>
                        <option value="invite_link">Invite link</option>
                      </select>
                    </label>
                    <label className="platform-field">
                      <span>Temporary password optional</span>
                      <input name="temporaryPassword" placeholder="Auto-generated if blank" />
                    </label>
                  </div>
                </section>

                <section className="platform-form-section">
                  <div className="platform-form-section-copy">
                    <p className="eyebrow">Website setup</p>
                    <h3>Tenant launch surface</h3>
                    <p>Subdomain, domain placeholder, homepage copy, and theme seed.</p>
                  </div>
                  <div className="platform-form-section-grid">
                    <label className="platform-field">
                      <span>Subdomain</span>
                      <input name="subdomain" placeholder="northwharf" required />
                    </label>
                    <label className="platform-field">
                      <span>Custom domain placeholder</span>
                      <input name="customDomain" placeholder="orders.northwharf.com" />
                    </label>
                    <label className="platform-field platform-field-full">
                      <span>Homepage title</span>
                      <input name="homepageTitle" placeholder="Order direct from North Wharf Kitchen." required />
                    </label>
                    <label className="platform-field platform-field-full">
                      <span>Short description</span>
                      <textarea
                        name="shortDescription"
                        rows={3}
                        placeholder="Fast direct ordering, delivery, collection, and restaurant updates in one branded storefront."
                        required
                      />
                    </label>
                    <label className="platform-field">
                      <span>Theme preset</span>
                      <select name="themePreset" defaultValue="sunset">
                        {THEME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="platform-form-section">
                  <div className="platform-form-section-copy">
                    <p className="eyebrow">Ordering settings</p>
                    <h3>Operational defaults</h3>
                    <p>Seed collection, delivery timing, radius, thresholds, and delivery fee.</p>
                  </div>
                  <div className="platform-form-section-grid">
                    <label className="platform-checkbox">
                      <input type="checkbox" name="collectionEnabled" value="true" defaultChecked />
                      <span>Collection enabled</span>
                    </label>
                    <label className="platform-checkbox">
                      <input type="checkbox" name="deliveryEnabled" value="true" defaultChecked />
                      <span>Delivery enabled</span>
                    </label>
                    <label className="platform-field">
                      <span>Default collection time</span>
                      <input name="defaultCollectionTimeMinutes" type="number" min="5" defaultValue="20" />
                    </label>
                    <label className="platform-field">
                      <span>Default delivery time</span>
                      <input name="defaultDeliveryTimeMinutes" type="number" min="5" defaultValue="45" />
                    </label>
                    <label className="platform-field">
                      <span>Delivery radius</span>
                      <input name="deliveryRadiusMiles" type="number" min="0" step="0.5" defaultValue="5" />
                    </label>
                    <label className="platform-field">
                      <span>Minimum order amount</span>
                      <input name="minimumOrderAmount" type="number" min="0" step="0.01" defaultValue="15" />
                    </label>
                    <label className="platform-field">
                      <span>Delivery fee</span>
                      <input name="deliveryFee" type="number" min="0" step="0.01" defaultValue="2.99" />
                    </label>
                  </div>
                </section>

                <section className="platform-form-section">
                  <div className="platform-form-section-copy">
                    <p className="eyebrow">Feature settings</p>
                    <h3>Modules and payment modes</h3>
                    <p>Enable only features restaurant should see on day one.</p>
                  </div>
                  <div className="platform-feature-grid">
                    <label className="platform-feature-card">
                      <input type="checkbox" name="onlineOrdering" value="true" defaultChecked />
                      <div>
                        <strong>Online ordering</strong>
                        <span>Public storefront and direct order flow.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="cashPayment" value="true" defaultChecked />
                      <div>
                        <strong>Cash payment</strong>
                        <span>Cash collection and delivery payment option.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="cardPayment" value="true" defaultChecked />
                      <div>
                        <strong>Card payment</strong>
                        <span>Stripe-backed online card checkout.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="customerLogin" value="true" defaultChecked />
                      <div>
                        <strong>Customer login</strong>
                        <span>Accounts, order history, and saved customer identity.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="tableBooking" value="true" defaultChecked />
                      <div>
                        <strong>Table booking</strong>
                        <span>Reservation flow and booking management.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="reviews" value="true" defaultChecked />
                      <div>
                        <strong>Reviews</strong>
                        <span>Public review sections and admin moderation.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="printerIntegration" value="true" defaultChecked />
                      <div>
                        <strong>Printer integration</strong>
                        <span>Kitchen print queue and station registration.</span>
                      </div>
                    </label>
                    <label className="platform-feature-card">
                      <input type="checkbox" name="driverModule" value="true" />
                      <div>
                        <strong>Driver module</strong>
                        <span>Driver login, assignment, and live delivery updates.</span>
                      </div>
                    </label>
                  </div>
                </section>

                <button type="submit" className="button-primary">
                  Create restaurant workspace
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
