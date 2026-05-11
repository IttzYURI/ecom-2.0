# Multi-Tenant Architecture

This document explains how the current single-restaurant prototype should evolve into a real multi-tenant SaaS without cloning the codebase per restaurant.

The target model is:

- one shared codebase
- one shared application deployment
- one shared database
- strict tenant separation by `tenantId`
- tenant resolution on the server, not from the frontend request body

## 1. Current hardcoded tenant assumptions

The current project already uses the word `tenant` in many places, but a large part of the runtime still behaves like a Bella Roma-first prototype.

Main hardcoded assumptions found during inspection:

- [apps/web/src/lib/mock-data.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/mock-data.ts) seeds `tenant_bella` / "Bella Roma" as the first and default tenant.
- [apps/web/src/lib/tenant.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/tenant.ts) used fallback tenant resolution based on slug/path/default instead of a proper hostname-driven resolver.
- [apps/web/src/lib/extadmin-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/extadmin-auth.ts) used a Bella Roma development secret fallback and did not carry tenant identity in the admin session token.
- [apps/web/src/lib/extadmin-user-store.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/extadmin-user-store.ts) seeded the owner against the default tenant, which is unsafe for real tenant separation.
- [apps/web/src/app/api/v1/public/checkout/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/public/checkout/route.ts) defaulted checkout writes to `tenant_bella`.
- [apps/web/src/app/api/v1/public/payments/intent/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/public/payments/intent/route.ts) defaulted payment intent creation to `tenant_bella`.
- [apps/web/src/app/api/v1/public/payments/confirm/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/public/payments/confirm/route.ts) defaulted payment confirmation to `tenant_bella`.
- many `/api/v1/extadmin/*` routes read `tenantId` from hidden form fields instead of resolving it from the authenticated admin session.
- [apps/web/src/app/api/v1/printing/stations/register/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/printing/stations/register/route.ts) accepted `tenantId` from the request body during printer registration.
- several customer and public tracking endpoints accept `tenantId` from request body or query string, which is not safe for production SaaS isolation.
- frontend local-storage keys and UI copy still contain Bella Roma naming in places like [apps/web/src/components/cart-ui.tsx](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/components/cart-ui.tsx), [apps/web/src/components/customer-session.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/components/customer-session.ts), and [apps/web/src/components/extadmin.tsx](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/components/extadmin.tsx).

## 2. Core SaaS rule

Never trust `tenantId` from the frontend body.

Tenant identity must come from one of these server-side trust sources:

- custom domain
- platform subdomain
- authenticated admin session
- authenticated printer device token

Temporary prototype fallback may still use the default tenant only when no real tenant signal exists, but that fallback should be treated as compatibility mode and removed later.

## 3. Tenant resolver design

Create one backend tenant resolver layer that all future services can call.

Recommended resolution sources:

### 3.1 Public storefront requests

Resolve in this order:

1. exact custom domain match
2. recognized subdomain on a platform hostname
3. temporary default-tenant fallback for local development compatibility

Examples:

- `bella.platform.test` -> tenant resolved by subdomain `bella`
- `order.bellaroma.com` -> tenant resolved by custom domain match
- `localhost:3000` -> temporary fallback to default tenant during the prototype phase

### 3.2 Extadmin requests

Resolve in this order:

1. `tenantId` stored inside the signed extadmin session
2. hostname fallback only for older prototype sessions or first login
3. temporary default fallback only for compatibility

Why:

- once an admin logs in, the server should not keep trusting hidden form fields
- the session becomes the secure source of tenant identity for menu/settings/order/staff actions

### 3.3 Printer device requests

Resolve in this order:

1. bearer device token -> hashed token lookup -> station -> tenant
2. no body `tenantId`

Why:

- printer devices are long-lived machine identities
- a printer should always operate inside exactly one tenant

### 3.4 Printer registration requests

Resolve in this order:

1. authenticated extadmin session tenant
2. hostname-derived tenant when a secure registration key is used
3. reject if no trusted tenant source exists

Why:

- printer registration creates a new trusted device
- it must not be assignable by a user-controlled body field

## 4. Required tenant strategy by domain

Every storage read and write must be tenant-scoped.

### Menu

- source of truth for tenant: extadmin session for admin writes, hostname for public reads
- required rule: every menu query includes `tenantId`
- do not accept `tenantId` from form/body during admin writes

### Orders

- source of truth for tenant: hostname for customer checkout and tracking, extadmin session for admin actions
- required rule: order creation, updates, status changes, and tracking reads must all include tenant scope
- order numbers should be unique per tenant, not globally

### Customers

- source of truth for tenant: hostname during signup/login/order history
- required rule: customer email uniqueness is tenant-scoped
- customer sessions should carry tenant context or be derived from the host that created them

### Admin users

- source of truth for tenant: extadmin session and tenant-scoped admin user repository
- required rule: admin login validates against the resolved tenant, not the default tenant
- every admin user read/write is filtered by tenant

### Settings

- source of truth for tenant: extadmin session for writes, hostname for public reads
- required rule: settings lookups and updates always use resolved tenant context

### Payments

- source of truth for tenant: hostname during checkout/payment confirmation, provider metadata plus stored payment linkage for webhooks
- required rule: payment records must store tenantId and orderId together
- webhook handlers should find payment by secure stored linkage, not trust loose tenant input

### Print jobs

- source of truth for tenant: order tenant or printer device tenant
- required rule: job queues, claims, acknowledgements, failures, and reprints are tenant-scoped

### Printer devices

- source of truth for tenant: extadmin session during registration, bearer token after registration
- required rule: device token lookup returns the tenant; frontend body must not choose the tenant

## 5. Safe implementation plan

This should happen in stages.

### Stage 1: Foundation

- add a backend tenant resolver module
- support domain, subdomain, admin session, and printer token resolution
- keep current default-tenant fallback only as compatibility mode
- make extadmin session tokens tenant-aware
- stop trusting `tenantId` from admin form fields
- stop trusting `tenantId` from printer registration body

This stage is safe because it improves trust boundaries without rewriting the whole app.

### Stage 2: Public route migration

- move customer auth, checkout, booking, contact, tracking, and payment routes to hostname-derived tenant resolution
- keep existing UI forms unchanged at first
- let the backend ignore tenant values from the browser

### Stage 3: Repository enforcement

- push tenant scope into service/repository interfaces
- require `tenantId` as a server-derived parameter to all repositories
- add tests that prove cross-tenant access is blocked

### Stage 4: Database enforcement

- move transactional data to PostgreSQL
- add tenant-scoped indexes
- add audit coverage for privileged actions

## 6. What was implemented in this foundation step

This phase adds the smallest safe backend foundation:

- a dedicated tenant resolver module
- hostname normalization and platform-host parsing
- optional custom domain mapping support for the JSON-backed tenant repository
- tenant-aware extadmin session tokens
- tenant-aware extadmin login validation
- extadmin routes shifted away from trusting hidden `tenantId` fields
- printer registration shifted away from trusting request-body `tenantId`

What is intentionally not fully migrated yet:

- all customer ordering and payment write paths
- all customer session flows
- all pages still rendering by default tenant
- full database enforcement at the SQL layer

## 7. Recommended next steps

Next safe steps after this foundation:

1. move customer auth, checkout, payment, booking, contact, and tracking APIs to hostname-derived tenant resolution
2. update public page loaders to resolve tenant from host instead of `getDefaultTenant()`
3. replace Bella Roma-specific local-storage keys and seeded copy where needed
4. add repository tests that prove tenant-scoped reads and writes
5. add SQL schema and migration enforcement for tenant-owned tables

## 8. Beginner-friendly summary

Right now the app still looks like one restaurant with some tenant scaffolding around it.

A real SaaS version should work like this:

- the domain tells the server which restaurant is being visited
- the admin login tells the server which restaurant the owner belongs to
- the printer token tells the server which restaurant the printer belongs to
- every database query uses that server-resolved tenant, not a value typed into a browser form

That is the key change that turns a single-restaurant prototype into one codebase serving many restaurants safely.
