"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import type { PlatformTenantListItem } from "../lib/platform-admin-service";
import { CreateBusinessModal } from "./platform-create-business-modal";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function getStatusTone(status: string) {
  if (status === "active" || status === "online" || status === "verified") {
    return "success";
  }

  if (status === "trialing" || status === "degraded" || status === "pending" || status === "past_due") {
    return "warning";
  }

  return "danger";
}

function TenantActionMenu({ restaurant }: { restaurant: PlatformTenantListItem }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const actions = [
    {
      label: "Manage tenant",
      href: `/platform/tenants/${restaurant.tenant.id}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    },
    {
      label: "Open admin login",
      href: restaurant.adminLoginPath,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      )
    },
    {
      label: `Status: ${restaurant.tenant.status}`,
      href: `/platform/tenants/${restaurant.tenant.id}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      )
    },
    {
      label: `Plan: ${restaurant.subscription?.planCode ?? "None"}`,
      href: `/platform/tenants/${restaurant.tenant.id}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <path d="M1 10h22" />
        </svg>
      )
    }
  ];

  return (
    <div className="tenant-menu" ref={menuRef}>
      <button
        type="button"
        className="tenant-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-label="More actions"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open ? (
        <div className="tenant-menu-dropdown">
          {actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="tenant-menu-item"
              onClick={() => setOpen(false)}
            >
              <span className="tenant-menu-item-icon">{action.icon}</span>
              {action.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BusinessesPageClient({ restaurants }: { restaurants: PlatformTenantListItem[] }) {
  const [query, setQuery] = useState("");

  const activeRestaurants = restaurants.filter(
    (r) => r.tenant.status === "active" || r.tenant.status === "trialing"
  );

  const filtered = query.trim()
    ? activeRestaurants.filter((r) => {
        const q = query.toLowerCase();
        const name = r.tenant.name.toLowerCase();
        const id = r.tenant.id.toLowerCase();
        const domains = r.domains.map((d) => d.domain.toLowerCase()).join(" ");
        return name.includes(q) || id.includes(q) || domains.includes(q);
      })
    : activeRestaurants;

  return (
    <section className="stack-xl">
      <div className="platform-page-header">
        <div>
          <h2>Businesses</h2>
          <p>{activeRestaurants.length} active businesses on the platform.</p>
        </div>
        <div className="businesses-toolbar">
          <div className="businesses-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID, or domain..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="businesses-search-input"
            />
            {query ? (
              <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
          <CreateBusinessModal />
        </div>
      </div>

      <article className="panel">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Primary domain</th>
                <th>Printing</th>
                <th>Recent orders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((restaurant) => {
                const primaryDomain =
                  restaurant.domains.find((d) => d.isPrimary)?.domain ??
                  restaurant.domains[0]?.domain ??
                  "Not configured";

                return (
                  <tr key={restaurant.tenant.id}>
                    <td data-label="Restaurant">
                      <div className="platform-table-primary">
                        <strong>{restaurant.tenant.name}</strong>
                        <span>{restaurant.tenant.id}</span>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`admin-badge ${getStatusTone(restaurant.tenant.status)}`}>
                        {restaurant.tenant.status}
                      </span>
                    </td>
                    <td data-label="Plan">
                      {restaurant.subscription ? (
                        <div className="platform-table-primary">
                          <strong>{restaurant.subscription.planCode}</strong>
                          <span>{restaurant.subscription.status}</span>
                        </div>
                      ) : (
                        "Not set"
                      )}
                    </td>
                    <td data-label="Primary domain">{primaryDomain}</td>
                    <td data-label="Printing">
                      <div className="platform-table-primary">
                        <strong>{restaurant.printerSummary.status.replaceAll("_", " ")}</strong>
                        <span>
                          {restaurant.printerSummary.onlineStations}/{restaurant.printerSummary.totalStations} online
                        </span>
                      </div>
                    </td>
                    <td data-label="Recent orders">
                      <div className="platform-table-primary">
                        <strong>{restaurant.orderSummary.totalOrders}</strong>
                        <span>{formatMoney(restaurant.orderSummary.grossRevenue)}</span>
                      </div>
                    </td>
                    <td data-label="Actions">
                      <div className="platform-table-actions">
                        <Link href={`/platform/tenants/${restaurant.tenant.id}`} className="button-ghost compact-button">
                          Manage
                        </Link>
                        <a href={restaurant.adminLoginPath} className="button-ghost compact-button">
                          Open admin
                        </a>
                        <TenantActionMenu restaurant={restaurant} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7}>
                    {query ? `No businesses matching "${query}".` : "No active businesses found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
