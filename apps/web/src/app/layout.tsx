import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Bella Roma",
  description: "Direct restaurant ordering, bookings, and customer experience website."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-banner">Direct ordering available for delivery and collection today.</div>
        <header className="site-header">
          <Link href="/" className="brand-lockup">
            Bella Roma
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/">Home</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/reviews">Reviews</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/booking">Book</Link>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="text-link">
              Login
            </Link>
            <Link href="/cart" className="button-primary compact-button">
              Cart
            </Link>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Bella Roma</strong>
            <span>Italian kitchen, direct online ordering, and warm neighborhood hospitality.</span>
          </div>
          <div className="footer-links">
            <Link href="/menu">Menu</Link>
            <Link href="/booking">Booking</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Account</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
