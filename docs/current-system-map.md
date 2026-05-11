# Current System Map

This document maps the system exactly as it exists in the repository today.

Goal of this document:

- explain the current project in beginner-friendly language
- show what is already built
- show where the system is still prototype-style
- separate "good foundations to keep" from "things that should be rebuilt"

Important context:

- this repo already has some SaaS-shaped structure
- the live behavior is still heavily centered around one default restaurant: `tenant_bella` / "Bella Roma"
- many pages and APIs look multi-tenant in naming, but the real runtime behavior is still mostly single-restaurant

## 1. Full Folder Structure Overview

This is the important structure of the repo. Generated folders like `node_modules`, `.next`, `dist`, and `release` are included here only for context, not because they are hand-written business logic.

```text
restaurant-commerce-cloud/
+-- apps/
|   +-- web/
|   |   +-- data/
|   |   |   +-- audit-log.json
|   |   |   +-- customer-users.json
|   |   |   +-- drivers.json
|   |   |   +-- extadmin-users.json
|   |   |   +-- media-content.json
|   |   |   +-- menu-content.json
|   |   |   +-- notifications-content.json
|   |   |   +-- operations-content.json
|   |   |   +-- payments-content.json
|   |   |   +-- reviews-content.json
|   |   |   +-- settings-content.json
|   |   |   \-- storefront-content.json
|   |   +-- public/
|   |   |   \-- uploads/
|   |   +-- scripts/
|   |   |   \-- run-next-dev.js
|   |   +-- src/
|   |   |   +-- app/
|   |   |   |   +-- account/
|   |   |   |   +-- admin/
|   |   |   |   +-- api/
|   |   |   |   |   \-- v1/
|   |   |   |   |       +-- admin/
|   |   |   |   |       +-- customer/
|   |   |   |   |       +-- driver/
|   |   |   |   |       +-- extadmin/
|   |   |   |   |       +-- platform/
|   |   |   |   |       +-- printing/
|   |   |   |   |       +-- public/
|   |   |   |   |       \-- webhooks/
|   |   |   |   +-- booking/
|   |   |   |   +-- cart/
|   |   |   |   +-- checkout/
|   |   |   |   +-- contact/
|   |   |   |   +-- customer-information/
|   |   |   |   +-- driver/
|   |   |   |   +-- extadmin/
|   |   |   |   +-- faq/
|   |   |   |   +-- gallery/
|   |   |   |   +-- login/
|   |   |   |   +-- menu/
|   |   |   |   +-- platform/
|   |   |   |   +-- reviews/
|   |   |   |   +-- signup/
|   |   |   |   +-- track/
|   |   |   |   +-- globals.css
|   |   |   |   +-- layout.tsx
|   |   |   |   \-- page.tsx
|   |   |   +-- components/
|   |   |   |   +-- admin.tsx
|   |   |   |   +-- cart-ui.tsx
|   |   |   |   +-- customer-auth-form.tsx
|   |   |   |   +-- customer-dashboard-page.tsx
|   |   |   |   +-- customer-information-page.tsx
|   |   |   |   +-- customer-session.ts
|   |   |   |   +-- delivery-tracking-view.tsx
|   |   |   |   +-- driver-console.tsx
|   |   |   |   +-- extadmin.tsx
|   |   |   |   +-- extadmin-orders-live-refresh.tsx
|   |   |   |   +-- layout-shell.tsx
|   |   |   |   +-- order-history-list.tsx
|   |   |   |   +-- public-interactions.tsx
|   |   |   |   +-- storefront.tsx
|   |   |   |   +-- tracking-live-map.tsx
|   |   |   |   \-- tracking-live-map-inner.tsx
|   |   |   \-- lib/
|   |   |       +-- audit-store.ts
|   |   |       +-- content-store.ts
|   |   |       +-- customer-auth.ts
|   |   |       +-- customer-user-store.ts
|   |   |       +-- delivery-tracking.ts
|   |   |       +-- driver-auth.ts
|   |   |       +-- driver-store.ts
|   |   |       +-- extadmin-auth.ts
|   |   |       +-- extadmin-user-store.ts
|   |   |       +-- inquiries-store.ts
|   |   |       +-- media-store.ts
|   |   |       +-- menu-store.ts
|   |   |       +-- mock-data.ts
|   |   |       +-- mongo.ts
|   |   |       +-- notifications-store.ts
|   |   |       +-- notifications.ts
|   |   |       +-- operations-store.ts
|   |   |       +-- password.ts
|   |   |       +-- payments-store.ts
|   |   |       +-- payments.ts
|   |   |       +-- printing-auth.ts
|   |   |       +-- printing-service.ts
|   |   |       +-- printing-store.ts
|   |   |       +-- printing-types.ts
|   |   |       +-- reviews-store.ts
|   |   |       +-- routing.ts
|   |   |       +-- settings-store.ts
|   |   |       +-- tenant-document-store.ts
|   |   |       +-- tenant.ts
|   |   |       +-- tracking-view.ts
|   |   |       \-- uploads.ts
|   |   +-- .next/                generated Next.js build output
|   |   \-- node_modules/         installed dependencies
|   \-- print-agent/
|       +-- scripts/
|       |   \-- copy-static.mjs
|       +-- src/
|       |   +-- main/
|       |   |   +-- api-client.ts
|       |   |   +-- job-runner.ts
|       |   |   +-- main.ts
|       |   |   +-- printer-service.ts
|       |   |   +-- settings-store.ts
|       |   |   \-- ticket-renderer.ts
|       |   +-- preload/
|       |   |   \-- index.ts
|       |   +-- renderer/
|       |   |   +-- app.ts
|       |   |   +-- index.html
|       |   |   \-- styles.css
|       |   \-- shared/
|       |       \-- types.ts
|       +-- dist/                 generated Electron build output
|       +-- release/              packaged Windows installer output
|       \-- node_modules/         installed dependencies
+-- packages/
|   \-- contracts/
|       \-- src/
|           \-- index.ts
+-- docs/
|   +-- printing-software-prd.md
|   \-- current-system-map.md
+-- package.json
+-- package-lock.json
+-- README.md
\-- tsconfig.base.json
```

Quick summary of responsibility:

- `apps/web`: main Next.js app for customers, restaurant owner admin, APIs, and platform screens
- `apps/print-agent`: Electron Windows desktop app for kitchen/receipt printing
- `packages/contracts`: shared TypeScript types for orders, tenants, print jobs, staff, bookings, and more
- `apps/web/data`: prototype storage when MongoDB is not configured

## 2. Customer-Facing Routes

These pages are intended for customers or public visitors:

- `/` - storefront homepage
- `/menu` - menu browsing and add-to-cart
- `/cart` - cart review, delivery/collection choice, delivery address
- `/customer-information` - guest details before checkout
- `/checkout` - final order submission and payment choice
- `/checkout/success` - order success page
- `/track/[token]` - public delivery tracking page
- `/booking` - booking request form
- `/contact` - contact page and enquiry form
- `/reviews` - review page
- `/faq` - FAQ page
- `/gallery` - gallery page
- `/login` - customer login
- `/signup` - customer signup
- `/account` - logged-in customer dashboard
- `/account/track-orders` - logged-in order tracking
- `/account/order-history` - logged-in order history

## 3. Admin Routes

Main current restaurant owner/admin area:

- `/extadmin/login` - owner login
- `/extadmin` - owner dashboard
- `/extadmin/orders` - order management and live delivery monitoring
- `/extadmin/menu` - category and menu item management
- `/extadmin/bookings` - booking review
- `/extadmin/content` - homepage/content/reviews management
- `/extadmin/media` - media library
- `/extadmin/settings` - restaurant settings
- `/extadmin/staff` - staff users, roles, password resets, audit entries

Important note:

- `/extadmin/*` is the only page group protected by middleware
- this is the most "real" admin area in the project today

Legacy or older-looking admin pages also exist:

- `/admin`
- `/admin/menu`
- `/admin/operations`

These legacy `/admin` pages appear to be older demo/admin views based mostly on mock data, not the protected owner system.

## 4. Super / Platform Admin Routes

Platform-level screens do exist:

- `/platform` - platform dashboard
- `/platform/tenants` - tenant directory

Important note:

- these pages currently have no authentication protection
- they read from mock tenant data, not a full production tenant platform backend

## 5. API Routes

All current APIs are under `/api/v1`.

### Public APIs

- `GET /api/v1/public/storefront`
- `GET /api/v1/public/menu`
- `POST /api/v1/public/postcode/validate`
- `POST /api/v1/public/contact`
- `POST /api/v1/public/bookings`
- `POST /api/v1/public/checkout`
- `POST /api/v1/public/payments/intent`
- `POST /api/v1/public/payments/confirm`
- `GET /api/v1/public/orders/track`
- `GET /api/v1/public/orders/track/stream`

### Customer Account APIs

- `GET /api/v1/customer/session`
- `POST /api/v1/customer/auth/login`
- `POST /api/v1/customer/auth/signup`
- `POST /api/v1/customer/auth/logout`
- `GET /api/v1/customer/orders/[id]/tracking`
- `GET /api/v1/customer/orders/[id]/tracking/stream`

### Restaurant Owner / Extadmin APIs

- `POST /api/v1/extadmin/login`
- `POST /api/v1/extadmin/logout`
- `POST /api/v1/extadmin/content`
- `POST /api/v1/extadmin/reviews`
- `POST /api/v1/extadmin/menu`
- `POST /api/v1/extadmin/menu/categories/create`
- `POST /api/v1/extadmin/menu/categories/delete`
- `POST /api/v1/extadmin/menu/items/create`
- `POST /api/v1/extadmin/menu/items/delete`
- `POST /api/v1/extadmin/settings`
- `POST /api/v1/extadmin/media/create`
- `POST /api/v1/extadmin/media/delete`
- `POST /api/v1/extadmin/media/upload`
- `POST /api/v1/extadmin/bookings/status`
- `POST /api/v1/extadmin/staff/create`
- `POST /api/v1/extadmin/staff/delete`
- `POST /api/v1/extadmin/staff/password`
- `POST /api/v1/extadmin/staff/role`
- `POST /api/v1/extadmin/staff/order-emails`
- `POST /api/v1/extadmin/orders/status`
- `POST /api/v1/extadmin/orders/delivery-status`
- `POST /api/v1/extadmin/orders/assign-driver`
- `POST /api/v1/extadmin/orders/reprint`
- `GET /api/v1/extadmin/orders/stream`

### Driver APIs

- `POST /api/v1/driver/login`
- `POST /api/v1/driver/logout`
- `GET /api/v1/driver/session`
- `GET /api/v1/driver/session/stream`
- `POST /api/v1/driver/orders/[id]/status`
- `POST /api/v1/driver/orders/[id]/location`

### Platform APIs

- `GET /api/v1/platform/tenants`
- `GET /api/v1/platform/settings`

### Printing APIs

- `POST /api/v1/printing/stations/register`
- `POST /api/v1/printing/stations/heartbeat`
- `GET /api/v1/printing/jobs/next`
- `POST /api/v1/printing/jobs/[id]/ack`
- `POST /api/v1/printing/jobs/[id]/printing`
- `POST /api/v1/printing/jobs/[id]/printed`
- `POST /api/v1/printing/jobs/[id]/failed`
- `POST /api/v1/printing/orders/[id]/reprint`

### Webhook APIs

- `POST /api/v1/webhooks/stripe`

### Legacy Admin Demo APIs

- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/menu-items`
- `GET /api/v1/admin/bookings`

## 6. Current Data Storage System

The app uses a layered prototype storage model:

### A. Optional MongoDB

If `MONGODB_URI` is configured, the app uses MongoDB.

Current Mongo-backed patterns include:

- tenant document storage via `tenant-document-store.ts`
- extadmin users via `extadmin_users`
- audit log via `audit_log`
- printing stations, jobs, and order print states via dedicated print collections

Examples of data collections used today:

- `storefront_content`
- `menu_content`
- `tenant_settings`
- `operations_content`
- `reviews_content`
- `payments_content`
- `notifications_content`
- `media_content`
- `extadmin_users`
- `audit_log`
- `printing_stations`
- `printing_jobs`
- `printing_order_states`
- `customer_users`
- `inquiries_content`

### B. JSON Files When MongoDB Is Not Configured

If MongoDB is not configured, the system writes directly to JSON files inside `apps/web/data/`.

This includes:

- storefront content
- menu content
- restaurant settings
- orders and bookings
- payments
- notifications
- customer users
- extadmin users
- drivers
- media assets
- reviews
- audit log
- enquiries
- printing state

What this means in plain English:

- the project can run without a database server
- but the fallback storage is local to one machine and one filesystem
- this is good for a prototype, not good for real SaaS scale

### C. Browser Local Storage

The frontend also uses browser `localStorage` for customer-side state:

- cart contents
- checkout preferences
- guest customer info
- a client-side mirror of customer session info

This makes the customer flow feel fast in a prototype, but it is not a reliable source of truth.

### D. Electron Local File Storage

The Windows print agent stores its own state in a local file:

- `print-agent-state.json` inside Electron user data

That file keeps:

- server URL
- tenant ID
- station name
- registration key
- station token
- selected printer
- auto-print settings
- device ID
- recent print history
- local logs

### E. Uploaded Files

Uploaded media goes into:

- `apps/web/public/uploads`

## 7. Current Authentication System

There are three different auth systems plus some unprotected areas.

### A. Extadmin / Owner Auth

Used for:

- `/extadmin/*`

How it works:

- login posts to `/api/v1/extadmin/login`
- server validates email and password from stored extadmin users
- server creates a signed cookie named `extadmin_session`
- middleware protects `/extadmin/*`

Current session behavior:

- cookie-based
- HMAC signed
- 12-hour expiry
- payload stores `email`, `role`, and expiry

### B. Customer Auth

Used for:

- `/account`
- `/account/track-orders`
- `/account/order-history`
- customer session/tracking APIs

How it works:

- login/signup returns a signed `customer_session` cookie
- frontend also writes basic customer data to `localStorage`
- account pages check the cookie server-side

Current session behavior:

- cookie-based
- HMAC signed
- 14-day expiry
- payload stores customer `id`, `email`, `name`, and expiry

### C. Driver Auth

Used for:

- `/driver`
- `/driver/login`
- driver session APIs

How it works:

- driver chooses a seeded driver and enters phone number
- server checks the selected driver and phone
- server creates a signed `driver_session` cookie

Current session behavior:

- cookie-based
- HMAC signed
- 12-hour expiry
- payload stores `driverId`, `tenantId`, and expiry

### D. Printing Station Auth

Used for:

- print station registration
- station heartbeat
- job polling
- job lifecycle updates

How it works:

- a station registers using either an owner session or a special registration key
- server returns a raw station token
- station later authenticates with `Authorization: Bearer <token>`
- server compares a hashed token value

### E. Unprotected or Weakly Protected Areas

These currently have no strong platform-grade access control:

- `/platform` pages
- `/api/v1/platform/*`
- legacy `/admin` pages
- legacy `/api/v1/admin/*`
- some driver mutation APIs rely on submitted driver IDs instead of requiring the driver cookie

## 8. Current Ordering Flow

This is the current customer ordering path.

1. Customer opens `/menu`.
2. Customer clicks "Add to order".
3. Cart is stored in browser `localStorage`.
4. Customer opens `/cart`.
5. Customer chooses `collection` or `delivery`.
6. If delivery, customer types an address in the cart page.
7. If customer is not logged in, checkout sends them to `/customer-information`.
8. If customer is logged in, checkout goes straight to `/checkout`.
9. `/checkout` sends the order to `POST /api/v1/public/checkout`.
10. Server looks up menu items from the stored menu.
11. Server creates an order record in the operations store.
12. Server creates delivery tracking data automatically for delivery orders.
13. Server emails the restaurant staff members who have order emails enabled.
14. Server also tries to email the customer.
15. If payment method is cash, the order becomes `placed` immediately.
16. If payment method is card, the order starts as `pending_payment` and waits for payment confirmation.

Current ordering logic is simple:

- item pricing comes from current menu item base price
- selected option groups are not really persisted through checkout yet
- delivery fee is fixed at `3.5`
- discount is fixed at `0`
- tax logic is not present
- no stock reservation or kitchen capacity check exists

## 9. Current Checkout Flow

The checkout flow is mostly frontend-driven and prototype-friendly.

### Customer-side behavior

- cart is read from `localStorage`
- checkout preference is read from `localStorage`
- guest customer info is read from `localStorage`
- logged-in customer info comes partly from cookie-backed session and partly from local browser state

### Page flow

1. Customer reaches `/checkout`.
2. If there is no customer session and no guest info, frontend redirects to `/customer-information`.
3. If delivery is selected but no address is saved, frontend redirects back to `/cart`.
4. Customer chooses payment type: `card` or `cash`.
5. Frontend calls `/api/v1/public/checkout`.
6. If card is selected, frontend then calls payment intent and payment confirm endpoints.
7. On success, frontend clears cart and checkout preference from browser storage.
8. Customer is redirected to `/checkout/success`.

What is important here:

- checkout is not server-orchestrated end-to-end
- the frontend manually chains multiple API calls
- there is no durable checkout session, quote object, or order draft object

## 10. Current Payment Flow

The payment flow is Stripe-shaped, but still prototype-level.

### Supported method today

- Stripe

### Actual flow

1. Checkout API creates the order first.
2. If customer selected card, frontend calls `POST /api/v1/public/payments/intent`.
3. Server creates a payment intent through the payment provider abstraction.
4. Server stores a payment record in `payments-content`.
5. Frontend calls `POST /api/v1/public/payments/confirm`.
6. Server marks payment as paid or failed.
7. Server updates the order payment status.
8. If paid, server may create an automatic print job.
9. Stripe webhook can also update payment status later through `/api/v1/webhooks/stripe`.

### Prototype shortcuts currently in use

- if Stripe is not configured, the system returns mock payment intent IDs like `pi_mock_*`
- mock confirmation marks the payment as paid immediately
- if Stripe test mode is configured, confirmation can happen server-side using `pm_card_visa`
- there is no real frontend card form or Stripe Elements flow in this repo

### What this means in plain English

- the project can demonstrate a card payment flow
- but it is not a production-grade payment architecture yet

## 11. Current Printing Flow

Printing is one of the more clearly separated subsystems in the project.

### Order-to-print flow

1. An order is created.
2. Server checks whether the order is eligible for automatic printing.
3. Eligible orders create a kitchen print job.
4. Print jobs are stored in the print store.
5. Electron print agent polls the server for available jobs.
6. Agent acknowledges a job.
7. Agent marks job as `printing`.
8. Agent prints to a Windows printer.
9. Agent marks job as `printed` or `failed`.
10. Server updates order print state and station activity.

### Auto-print eligibility rules right now

An order auto-prints only if:

- it exists
- it is not cancelled or refunded
- it has not already had a kitchen print
- if cash: order status is `placed`
- if Stripe/card: order status is `placed` and payment status is `paid`

### Reprints

Manual reprints can be triggered from:

- `/api/v1/extadmin/orders/reprint`
- `/api/v1/printing/orders/[id]/reprint`

### Print tracking stored by the server

The system keeps:

- print stations
- print jobs
- per-order print state
- last printed time
- print counts
- reprint counts
- last error

## 12. Electron Print-Agent Structure

The Electron print agent is split into standard Electron layers.

### `src/main`

Desktop/backend side of the Electron app:

- `main.ts` - boots Electron window and wires IPC
- `job-runner.ts` - main polling and printing workflow
- `api-client.ts` - calls the web app printing APIs
- `printer-service.ts` - sends tickets to Windows printers
- `settings-store.ts` - persists local config and history
- `ticket-renderer.ts` - builds printable HTML ticket content

### `src/preload`

- `index.ts` - safe bridge that exposes a limited `window.printAgent` API to the renderer

### `src/renderer`

Desktop frontend:

- `app.ts` - print-agent dashboard UI
- `index.html` - renderer shell
- `styles.css` - renderer styles

### `src/shared`

- `types.ts` - shared Electron-side types for config, queue, history, and logs

### Runtime behavior of the print agent

- polls every 3 seconds for jobs
- sends heartbeat every 15 seconds
- can auto-register if a registration key is present
- can auto-print if a printer is selected and auto-print is enabled
- uses a hidden Electron `BrowserWindow` to print HTML silently

## 13. Current Hardcoded Restaurant / Tenant Assumptions

This is one of the biggest realities of the current system.

Even though the repo uses words like `tenant`, many defaults are still hardcoded around Bella Roma.

Examples:

- default tenant is usually `tenant_bella`
- public pages usually call `getDefaultTenant()` instead of resolving a real tenant dynamically
- checkout defaults to `tenant_bella`
- payments default to `tenant_bella`
- extadmin actions default to `tenant_bella`
- order numbers use the Bella Roma style prefix: `BR-1234`
- fallback auth secrets reference Bella Roma
- default owner email is `owner@bellaroma.test`
- default owner password is `demo1234`
- customer session/local storage keys are named with `bella-roma-*`
- print-agent default config uses:
  - `tenantId = tenant_bella`
  - `serverUrl = http://localhost:3000`
  - `stationName = Kitchen Station 1`
- restaurant content, hero copy, and public branding are heavily written around Bella Roma
- delivery pricing is fixed rather than tenant-configured in the checkout path
- postcode validation checks the default tenant only
- routing coordinates are hardcoded for seeded tenants in London
- currency formatting assumes GBP

Short version:

- the project has multi-tenant naming
- the live implementation is still mostly "single restaurant with some tenant scaffolding around it"

## 14. Current Security Risks

These are the most important current risks visible in the codebase.

- Hardcoded fallback secrets exist for extadmin, customer, driver, and printing auth. If environment secrets are missing, the app still runs with predictable defaults.
- Default owner credentials are prototype-friendly and weak for real deployment.
- Platform pages and platform APIs are not protected by authentication.
- Legacy `/admin` pages and legacy `/api/v1/admin/*` endpoints are not protected and expose restaurant data based on mock data.
- Driver order update APIs do not require the driver session cookie. They trust a submitted `driverId` in the request body.
- Customer cart, guest info, and client-side customer session mirror are stored in browser `localStorage`, which is easy to tamper with on the client.
- Checkout creates the order before the card payment is confirmed. That means unpaid/pending orders can be created first.
- Mock payment success is allowed when Stripe is not configured, which is useful for demos but dangerous if left enabled in a real environment.
- Stripe webhook verification falls back to plain JSON parsing when Stripe secret/signature are not configured.
- Extadmin session payload only carries email and a fixed role string, not a robust tenant-scoped permission model.
- Tenant defaults are often taken from request body or hardcoded defaults, so tenant isolation is not strongly enforced.
- Media uploads are stored in the public app filesystem, which is fine for a prototype but not ideal for secure production storage.
- Contact, booking, and other public APIs do not show rate limiting, abuse protection, or CAPTCHA.
- Printing registration depends on a shared registration key or owner session, but there is no more advanced device trust model.

## 15. Current Scalability Risks

These are the main scale problems if this prototype were pushed into real SaaS usage.

- JSON file storage is not safe for high write volume, multiple app instances, or concurrent writes.
- Local filesystem state means horizontal scaling will break unless every instance shares storage correctly.
- Browser `localStorage` cart state is tied to one browser/device and cannot be shared across devices.
- Most of the live app still assumes one default tenant, which blocks real multi-tenant onboarding.
- Orders, payments, notifications, and printing are tightly coupled to synchronous request flows instead of background jobs.
- Email sending happens inline during request handling.
- Printing uses polling every 3 seconds per print station, which becomes noisy at scale.
- Live updates are done with simple server-sent event loops and repeated polling, not a shared pub/sub or event bus.
- No clear idempotency strategy exists around checkout, payment, and order creation.
- No queueing infrastructure exists for notifications, payments, printing retries, or booking workflows.
- Driver tracking and delivery status are stored in the same prototype-style operations store as normal order data.
- Legacy mock-data paths still sit beside runtime storage paths, which makes long-term behavior harder to reason about.

## 16. Which Parts Should Be Kept

These are good foundations worth preserving.

- Monorepo structure with `apps/web`, `apps/print-agent`, and `packages/contracts`
- Shared contracts/types package. This is a good SaaS foundation because web and desktop already share domain language.
- Route grouping inside Next.js App Router. Customer, owner, platform, driver, printing, and webhooks are already separated conceptually.
- Store/service code boundaries in `src/lib`. Even though implementation is prototype-level, the separation of concerns is useful.
- Delivery tracking domain model. The tracking events and delivery status model are a solid starting point.
- Printing architecture. The separation between print jobs, print stations, print state, and desktop agent is one of the strongest parts of the repo.
- Audit log and notification concepts. They are basic, but they already point in the right direction for operational visibility.
- Owner/admin page grouping under `/extadmin`. This is a better foundation than the legacy `/admin` area.

## 17. Which Parts Should Be Rebuilt

These are the areas that should be rebuilt or heavily redesigned for a real SaaS foundation.

- Tenant resolution and tenant isolation. Multi-tenant behavior should move from naming conventions to real enforced tenant boundaries.
- Authentication and authorization. Replace prototype cookie patterns and fallback secrets with real auth, roles, permissions, and tenant-scoped access checks.
- Persistence layer. Move fully to a production database design instead of JSON fallback for live operations.
- Checkout pipeline. Build a durable checkout/session/order-intent flow instead of chaining frontend calls and creating orders first.
- Payment flow. Replace mock/test shortcuts with a proper Stripe production integration and idempotent payment orchestration.
- Driver action security. Delivery status and location updates should require authenticated driver identity, not submitted IDs.
- Platform admin. Add real platform auth, tenant management, and platform-level data models.
- Notification system. Move email sending out of request handlers into background jobs.
- Printing orchestration. Keep the concept, but back it with stronger queueing, better retry control, and production-grade observability.
- Customer cart and guest checkout state. Move away from browser-only storage toward server-backed cart/checkout state.
- Legacy `/admin` pages and demo APIs. Either remove them or clearly separate them from the real owner/admin product.

## Final Summary

Current reality in one sentence:

This repository already has strong structural hints of a restaurant SaaS platform, but the actual runtime behavior is still a Bella-Roma-first single-restaurant prototype with optional MongoDB, local JSON fallback storage, prototype auth, and a relatively strong but still early printing subsystem.

If this project is moving into a SaaS foundation rebuild, the safest approach is:

- keep the monorepo shape
- keep the contracts package
- keep the print-agent separation
- keep the delivery/printing domain concepts
- rebuild tenant isolation, auth, persistence, checkout, payments, and platform operations on top of those foundations
