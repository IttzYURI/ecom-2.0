# Authentication And RBAC Plan

This document explains the current authentication setup, the main risks, and the safe RBAC foundation added in this phase.

The goal is simple:

- keep existing login flows working where possible
- stop trusting dangerous identity fields from browser requests
- make tenant isolation explicit
- add a production-ready structure for role and permission checks

## 1. Current auth audit

The project originally used separate homemade auth flows for different actor types.

Current auth entry points found during inspection:

- [apps/web/src/lib/extadmin-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/extadmin-auth.ts) for restaurant admin cookies
- [apps/web/src/lib/customer-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/customer-auth.ts) for customer cookies
- [apps/web/src/lib/driver-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/driver-auth.ts) for driver cookies
- [apps/web/src/lib/printing-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/printing-auth.ts) for printer device tokens

Main weaknesses found before this phase:

- platform admin routes did not have a real super admin login system
- restaurant admin APIs often trusted hidden `tenantId` form fields
- driver APIs trusted `driverId` or `tenantId` from request bodies
- customer sessions were not fully tenant-aware
- legacy `/admin` routes were protected weakly or not consistently
- permission enforcement was scattered and route-specific instead of centralized
- some pages and APIs still fell back to the default Bella Roma tenant

## 2. User types

These are the actor types the system needs to support.

### Super admin

- scope: platform-wide
- purpose: tenant lifecycle, platform settings, support operations
- trust source: secure platform session cookie

### Restaurant owner

- scope: one tenant only
- purpose: full restaurant administration
- trust source: restaurant admin session cookie

### Restaurant staff

- scope: one tenant only
- purpose: limited restaurant operations based on assigned permissions
- trust source: restaurant admin session cookie plus RBAC role mapping

### Driver

- scope: one tenant only and only assigned deliveries
- purpose: update delivery status and delivery location for assigned orders
- trust source: driver session cookie

### Customer

- scope: one tenant only and only their own account/orders
- purpose: sign in, view account, view own orders and tracking
- trust source: customer session cookie

### Printer device

- scope: one tenant only and only that restaurant's print queue
- purpose: register, heartbeat, claim, print, and fail print jobs
- trust source: printer bearer token

## 3. Security rules

These rules should be treated as mandatory.

- never trust `tenantId` from the frontend body
- never trust `userId` from the frontend body for privileged actions
- never trust `driverId` from the frontend body for delivery actions
- tenant must come from hostname, authenticated session, or printer token
- every protected API must verify login first
- every protected API must verify actor type or role next
- every protected API must scope reads and writes to the actor tenant
- customers may only access their own orders
- drivers may only access their assigned orders
- printer devices may only access their own tenant print jobs
- super admin routes must not be exposed publicly

## 4. RBAC model

Restaurant admin access now uses a normalized permission model.

Implemented tenant permissions live in [apps/web/src/lib/rbac.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/rbac.ts):

- `tenant.dashboard.read`
- `tenant.content.write`
- `tenant.media.write`
- `tenant.menu.write`
- `tenant.bookings.manage`
- `tenant.orders.read`
- `tenant.orders.manage`
- `tenant.orders.assign_driver`
- `tenant.print.manage`
- `tenant.reviews.write`
- `tenant.settings.write`
- `tenant.staff.manage`

Current role mapping:

- `role_owner` -> full tenant permissions
- `role_manager` -> day-to-day operational permissions, but not full settings/staff control

This is a practical bridge from the prototype role model to a production-friendly permission system.

## 5. Central auth and authorization helpers

This phase adds shared helpers so route files stop inventing their own auth rules.

Main foundation files:

- [apps/web/src/lib/platform-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/platform-auth.ts)
  Creates and verifies the platform super admin session.

- [apps/web/src/lib/rbac.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/rbac.ts)
  Defines tenant permissions and role-to-permission mapping.

- [apps/web/src/lib/authz.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/authz.ts)
  Centralizes authorization checks for platform admins, restaurant admins, drivers, customers, and printer devices.

- [apps/web/src/middleware.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/middleware.ts)
  Protects `/platform`, `/extadmin`, and `/admin` routes at the edge before the page loads.

Main helper functions:

- `requirePlatformSuperAdminApi(request)`
- `requireExtAdminPermission(request, permission)`
- `requireExtAdminPermissionApi(request, permission)`
- `requireDriverActor(request)`
- `requireDriverAssignedOrder(request, orderId)`
- `requireCustomerActor(request)`
- `requireCustomerOrderAccess(request, orderId)`
- `requirePrintStationActor(request)`

## 6. What changed in this phase

### Platform super admin

Added a real platform login flow:

- [apps/web/src/app/platform/login/page.tsx](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/platform/login/page.tsx)
- [apps/web/src/app/api/v1/platform/login/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/platform/login/route.ts)
- [apps/web/src/app/api/v1/platform/logout/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/platform/logout/route.ts)

Platform API routes now require a valid super admin session:

- [apps/web/src/app/api/v1/platform/settings/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/platform/settings/route.ts)
- [apps/web/src/app/api/v1/platform/tenants/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/platform/tenants/route.ts)

Platform pages now also redirect server-side if no platform session exists:

- [apps/web/src/app/platform/page.tsx](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/platform/page.tsx)
- [apps/web/src/app/platform/tenants/page.tsx](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/platform/tenants/page.tsx)

### Restaurant admin

Restaurant admin sessions now carry:

- `userId`
- `email`
- `tenantId`
- `userType`

That work lives in [apps/web/src/lib/extadmin-auth.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/extadmin-auth.ts).

Restaurant admin login now validates against the resolved tenant and creates a tenant-aware session:

- [apps/web/src/app/api/v1/extadmin/login/route.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/app/api/v1/extadmin/login/route.ts)
- [apps/web/src/lib/extadmin-user-store.ts](/F:/Devs/ecom%20backup%201/ecom%202.0/apps/web/src/lib/extadmin-user-store.ts)

Protected restaurant admin APIs now use permission helpers instead of trusting form `tenantId` values.

Examples:

- menu/content/media/settings routes require write permissions
- order routes require order permissions
- staff routes require staff-management permission
- printing reprint routes require print-management permission

Legacy `/admin` routes now also read tenant data from the authenticated admin session instead of the default tenant.

Stripe webhook payment updates now resolve the tenant by the stored payment record tied to the Stripe external payment ID.

That removes the old Bella-Roma fallback assumption from webhook handling.

### Driver

Driver login now resolves the tenant from the request host, not from a submitted `tenantId`.

Driver action APIs now:

- verify the driver session
- verify the driver still exists and is active
- verify the target order belongs to that tenant
- verify the order is assigned to that driver

This closes the earlier risk where one driver could attempt to update another driver's order by sending a different `driverId` or `tenantId`.

### Customer

Customer sessions now carry `tenantId`.

Customer order tracking APIs now:

- require a customer session
- load the order inside the session tenant
- compare the order email with the signed customer session email

This prevents a customer from reading another customer's orders by guessing an order ID.

### Printer device

Printer endpoints now use a shared printer-device authorization helper.

Printer registration no longer trusts request-body `tenantId`.

Instead it resolves tenant from:

1. authenticated restaurant admin session, or
2. a secure registration key plus the request hostname

## 7. Permission check pattern for protected APIs

Every protected route should follow this order:

1. identify the actor from a trusted source
2. verify the actor is logged in or authenticated
3. verify the actor belongs to the correct tenant
4. verify the actor is allowed to do this action
5. run the tenant-scoped read or write

Examples:

- restaurant admin writes:
  `session cookie -> user record -> role permissions -> tenant-scoped repository write`

- driver delivery update:
  `driver cookie -> active driver -> assigned order check -> tenant-scoped order update`

- customer tracking:
  `customer cookie -> tenant-scoped order load -> email ownership check -> return tracking data`

- printer job claim:
  `bearer token -> printer station -> station tenant -> tenant-scoped print job lookup`

## 8. Dangerous patterns removed or reduced

The following dangerous prototype patterns were replaced or reduced in this phase:

- admin APIs trusting hidden `tenantId` fields
- driver APIs trusting `tenantId` and `driverId` from request payloads
- customer sessions without tenant context
- public platform routes without a proper super admin session
- repeated route-level auth logic without a shared authorization layer

## 9. What still needs work

This phase adds the safe foundation, not the full final security program.

Still to do:

- move more page loaders away from Bella Roma/default-tenant assumptions
- replace remaining Bella Roma-specific UI copy and local-storage names
- add audit logging for permission failures and privileged changes
- add automated tests around cross-tenant access denial
- move tenant enforcement deeper into repositories as the SQL migration continues

## 10. Beginner-friendly summary

Before this phase, the app had logins, but the trust model was weak.

That meant some routes could believe values sent by the browser, which is dangerous in a SaaS app because browsers are easy to tamper with.

After this phase, the foundation is safer:

- platform access uses a dedicated super admin session
- restaurant admin access uses tenant-aware sessions plus permission checks
- driver routes only work for the assigned driver and assigned order
- customer routes only work for the signed-in customer's own orders
- printer routes only work for the printer's own restaurant

This is the correct direction for a production multi-tenant SaaS, while still keeping the current prototype working during migration.
