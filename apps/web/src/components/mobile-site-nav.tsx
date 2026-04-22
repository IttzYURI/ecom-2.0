"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type MobileSiteNavProps = {
  accountHref: Route;
  accountLabel: string;
};

const PRIMARY_LINKS = [
  { href: "/" as Route, label: "Home" },
  { href: "/menu" as Route, label: "Menu" },
  { href: "/gallery" as Route, label: "Gallery" },
  { href: "/reviews" as Route, label: "Reviews" },
  { href: "/faq" as Route, label: "FAQ" },
  { href: "/contact" as Route, label: "Contact" },
  { href: "/booking" as Route, label: "Book" }
] as const;

export function MobileSiteNav({ accountHref, accountLabel }: MobileSiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-site-drawer"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mobile-nav-toggle-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div
        className={`mobile-nav-overlay${open ? " is-open" : ""}`}
        aria-hidden={open ? undefined : true}
        onClick={() => setOpen(false)}
      />

      <aside
        id="mobile-site-drawer"
        className={`mobile-nav-drawer${open ? " is-open" : ""}`}
        aria-hidden={open ? undefined : true}
      >
        <div className="mobile-nav-drawer-head">
          <strong>Bella Roma</strong>
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          >
            {"\u00d7"}
          </button>
        </div>

        <nav className="mobile-nav-list" aria-label="Mobile primary navigation">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "is-active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mobile-nav-actions">
          <Link href="/menu" className="button-primary block-button">
            Order now
          </Link>
          <Link href={accountHref} className="button-ghost block-button">
            {accountLabel}
          </Link>
        </div>
      </aside>
    </>
  );
}

