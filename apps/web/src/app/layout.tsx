import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { MobileSiteNav } from "../components/mobile-site-nav";
import { SiteBanner } from "../components/site-banner";
import { getCustomerSessionFromCookieStore } from "../lib/customer-auth";
import { getStoredTenantSettings } from "../lib/settings-store";
import type { TenantFeatureFlagsRecord } from "../lib/tenant-feature-flags-store";
import { getTenantFeatureFlagsRecord } from "../lib/tenant-feature-flags-store";
import { resolveTenantIdFromRequest } from "../lib/tenant";

import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await resolveTenantIdFromRequest();
    const tenant = await getStoredTenantSettings(tenantId);

    return {
      title: tenant.branding?.logoText ?? tenant.name,
      description: tenant.description,
      openGraph: tenant.branding?.heroImage
        ? { images: [{ url: tenant.branding.heroImage }] }
        : undefined
    };
  } catch {
    return {
      title: "Restaurant",
      description: "Direct restaurant ordering, bookings, and customer experience website."
    };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const customerSession = await getCustomerSessionFromCookieStore();
  const accountHref: Route = customerSession ? "/account" : "/login";
  const accountLabel = customerSession?.name || (customerSession ? "Account" : "Login");

  let tenant;
  let features: TenantFeatureFlagsRecord | null = null;
  try {
    const tenantId = await resolveTenantIdFromRequest();
    tenant = await getStoredTenantSettings(tenantId);
    features = await getTenantFeatureFlagsRecord(tenantId);
  } catch {
    tenant = null;
  }

  const showGallery = features?.gallery !== false;
  const showReviews = features?.reviews !== false;
  const showBooking = features?.tableBooking !== false;

  const brandName = tenant?.branding?.logoText ?? tenant?.name ?? "Restaurant";
  const brandColor = tenant?.branding?.primaryColor ?? "#9d2f2f";
  const accentColor = tenant?.branding?.accentColor ?? "#f5d9a6";
  const heroImage = tenant?.branding?.heroImage ?? "";

  return (
    <html
      lang="en"
      style={{
        "--brand-primary": brandColor,
        "--brand-accent": accentColor,
        ...(heroImage ? { "--brand-hero-image": `url(${heroImage})` } as React.CSSProperties : {})
      } as React.CSSProperties}
    >
      <body>
        <SiteBanner />
        <header className="site-header">
          <div className="chrome-inner">
            <Link href="/" className="brand-lockup">
              {brandName}
            </Link>
            <nav className="nav-links" aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/menu">Menu</Link>
              {showGallery ? <Link href="/gallery">Gallery</Link> : null}
              {showReviews ? <Link href="/reviews">Reviews</Link> : null}
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact</Link>
              {showBooking ? <Link href="/booking">Book</Link> : null}
            </nav>
            <div className="header-actions">
              <Link href="/menu" className="button-primary compact-button">
                ORDER NOW
              </Link>
              {customerSession ? (
                <Link href="/account" className="button-ghost compact-button account-button">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="account-button-icon">
                    <path d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12Zm0 2c-4.14 0-7.5 2.57-7.5 5.75a.75.75 0 0 0 1.5 0c0-2.19 2.69-4.25 6-4.25s6 2.06 6 4.25a.75.75 0 0 0 1.5 0C19.5 16.57 16.14 14 12 14Z" />
                  </svg>
                  <span>{customerSession.name || "Account"}</span>
                </Link>
              ) : (
                <Link href="/login" className="button-ghost compact-button">
                  Login
                </Link>
              )}
            </div>
            <MobileSiteNav accountHref={accountHref} accountLabel={accountLabel} brandName={brandName} />
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="chrome-inner footer-inner">
            <div className="footer-brand">
              <strong>{brandName}</strong>
              <span>{tenant?.description ?? "Direct online ordering and warm hospitality."}</span>
              <div className="footer-contact">
                {tenant?.address ? (
                  <div>
                    <p>Visit us</p>
                    <strong>{tenant.address}</strong>
                  </div>
                ) : null}
                {tenant?.phone ? (
                  <div>
                    <p>Call</p>
                    <strong>{tenant.phone}</strong>
                  </div>
                ) : null}
              </div>
              <div className="footer-socials" aria-label="Social media links">
                <a href="https://instagram.com" target="_blank" rel="noreferrer">
                  <span className="sr-only">Instagram</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.4" cy="6.6" r="1.2" />
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer">
                  <span className="sr-only">Facebook</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.6-1.6H16V4.8c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.8V11H8v3h2.3v7h3.2Z" />
                  </svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noreferrer">
                  <span className="sr-only">TikTok</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.7 3c.3 2.3 1.6 3.9 3.8 4.2v2.7a7.1 7.1 0 0 1-3.8-1.2v6.1a5.2 5.2 0 1 1-5.2-5.2c.3 0 .7 0 1 .1v2.8a2.4 2.4 0 1 0 1.4 2.2V3h2.8Z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="footer-links">
              <Link href="/menu">Menu</Link>
              {showBooking ? <Link href="/booking">Booking</Link> : null}
              <Link href="/contact">Contact</Link>
              <Link href={customerSession ? "/account" : "/login"}>Account</Link>
            </div>
            <div className="footer-meta-block">
              <div className="footer-hours" aria-label="Business hours">
                <p>Business hours</p>
                <div className="footer-hours-placeholder">
                  <span>Check back soon for updated hours</span>
                </div>
              </div>
              <div className="footer-meta">&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
