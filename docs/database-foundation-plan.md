# Database Foundation Plan

This document proposes a production-ready persistence foundation for the restaurant SaaS without breaking the current app.

It is based on the current repository state:

- current runtime storage is mostly JSON files in `apps/web/data`
- optional MongoDB is used as a tenant document store for some data
- shared business types live in `packages/contracts/src/index.ts`
- there is no real production relational schema yet
- domains and subscriptions are not properly modeled yet

This plan does **not** remove existing features.

This plan does **not** migrate live data yet.

This plan is the preparation layer before implementation.

## 1. Goals

Main goals:

- keep the current app working
- introduce a production-grade multi-tenant data model
- stop future features from depending directly on JSON files
- support gradual migration instead of a risky big-bang rewrite
- make tenant isolation stronger
- support future billing, domains, subscriptions, and platform admin

## 2. Recommended Database Choice

Recommended primary database:

- **PostgreSQL**

Why PostgreSQL is the best fit here:

- strong relational integrity for orders, payments, users, subscriptions, and audit logs
- supports multi-tenant indexing well
- transactions are important for checkout and payments
- JSONB can still be used for flexible content where full normalization is not worth it yet
- mature tooling for migrations, backups, reporting, and analytics

Recommended rule:

- use PostgreSQL as the **source of truth**
- keep MongoDB out of the new core design
- if flexible document storage is still needed later, use PostgreSQL `jsonb` first

## 3. Current Persistence Audit

Current JSON stores in `apps/web/data`:

- `settings-content.json`
- `storefront-content.json`
- `menu-content.json`
- `operations-content.json`
- `payments-content.json`
- `customer-users.json`
- `extadmin-users.json`
- `drivers.json`
- `reviews-content.json`
- `media-content.json`
- `notifications-content.json`
- `audit-log.json`

Current Mongo-backed or optional collections:

- `tenant_settings`
- `storefront_content`
- `menu_content`
- `operations_content`
- `payments_content`
- `customer_users`
- `extadmin_users`
- `reviews_content`
- `media_content`
- `notifications_content`
- `audit_log`
- `printing_stations`
- `printing_jobs`
- `printing_order_states`
- `inquiries_content`

Current architectural problem:

- most store modules combine **business logic + persistence logic + fallback logic** in the same file
- the app calls store functions directly
- that makes migration harder because JSON files are not just storage, they are part of the service layer

## 4. Target Architecture Summary

Target shape:

```text
Route/API/Page
  -> Service Layer
    -> Repository Interfaces
      -> Storage Adapter
        -> PostgreSQL
```

Temporary transition shape:

```text
Route/API/Page
  -> Service Layer
    -> Repository Interfaces
      -> JSON Adapter (current behavior)
      -> PostgreSQL Adapter (new)
```

Important rule:

- routes and UI should not know whether data came from JSON, Mongo, or PostgreSQL

## 5. Multi-Tenant Strategy

Recommended tenancy model:

- one shared PostgreSQL database
- every business table includes `tenant_id`
- platform-owned tables may omit `tenant_id` only when they are truly global
- all repository queries must scope by `tenant_id`

Why this model:

- easiest migration from the current code
- simpler operations than database-per-tenant
- good fit for small to medium SaaS scale
- still allows later partitioning by tenant or date if needed

Recommended tenant identity split:

- `tenants` table for the restaurant account itself
- `tenant_domains` for custom domains and subdomains
- `tenant_settings` for operational configuration
- `tenant_branding` or branding fields inside settings

## 6. Proposed Core Schema

Notes before the schema:

- table names below are written in SQL-style snake_case
- UUID primary keys are recommended for new production tables
- money should be stored as integer minor units where possible
- all tables should include timestamps like `created_at` and `updated_at`

### 6.1 `tenants`

Purpose:

- one record per restaurant account

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | primary key |
| `slug` | text unique | public tenant slug |
| `name` | text | restaurant/business name |
| `status` | text | `active`, `suspended`, `archived`, `trialing` |
| `legal_name` | text null | optional company/legal entity name |
| `support_email` | text null | tenant business email |
| `support_phone` | text null | tenant phone |
| `timezone` | text | tenant timezone |
| `currency_code` | text | default `GBP` today, but future-safe |
| `country_code` | text null | future tax/compliance support |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `slug`
- index on `status`

### 6.2 `tenant_domains`

Purpose:

- map subdomains and custom domains to a tenant

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `domain` | text unique | full domain like `bella.example.com` |
| `domain_type` | text | `subdomain`, `custom` |
| `is_primary` | boolean | primary public hostname |
| `verification_status` | text | `pending`, `verified`, `failed` |
| `ssl_status` | text null | optional future use |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `domain`
- index on `(tenant_id, is_primary)`

### 6.3 `users`

Purpose:

- platform admins and restaurant staff accounts

Important design choice:

- keep **staff/platform users** separate from **customers**
- this is simpler because they have different login flows and permissions today

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid null fk -> tenants.id | null for platform users |
| `email` | citext | case-insensitive email |
| `password_hash` | text | |
| `full_name` | text | |
| `user_type` | text | `platform_admin`, `tenant_owner`, `tenant_staff`, `driver` |
| `status` | text | `active`, `invited`, `disabled` |
| `last_login_at` | timestamptz null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, email)` for tenant users
- unique partial index on `(email)` where `tenant_id is null` for platform users

### 6.4 `roles`

Purpose:

- keep role-based authorization flexible

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid null fk -> tenants.id | null for platform-wide roles |
| `name` | text | |
| `description` | text null | |
| `is_system_role` | boolean | prevent accidental deletion |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.5 `role_permissions`

Purpose:

- normalize permissions instead of storing arrays inside the user row

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `role_id` | uuid fk -> roles.id | |
| `permission_key` | text | e.g. `orders.update_status` |

Primary key:

- `(role_id, permission_key)`

### 6.6 `user_roles`

Purpose:

- many-to-many user-to-role mapping

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid fk -> users.id | |
| `role_id` | uuid fk -> roles.id | |

Primary key:

- `(user_id, role_id)`

### 6.7 `customers`

Purpose:

- customer accounts for ordering and order history

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | customer belongs to a tenant storefront today |
| `email` | citext | |
| `password_hash` | text null | null if guest-only or future passwordless |
| `full_name` | text | |
| `phone` | text null | |
| `marketing_opt_in` | boolean | future-safe |
| `status` | text | `active`, `disabled` |
| `last_login_at` | timestamptz null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, email)`

### 6.8 `customer_addresses`

Purpose:

- support delivery history and repeat checkout

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `customer_id` | uuid fk -> customers.id | |
| `label` | text null | e.g. Home, Work |
| `line_1` | text | |
| `line_2` | text null | |
| `city` | text null | |
| `postcode` | text null | |
| `country_code` | text null | |
| `is_default` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.9 `tenant_settings`

Purpose:

- operational and public restaurant settings

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `tenant_id` | uuid pk fk -> tenants.id | one row per tenant |
| `description` | text null | |
| `cuisine` | text null | |
| `contact_email` | text null | |
| `contact_phone` | text null | |
| `address_line_1` | text null | |
| `address_line_2` | text null | |
| `city` | text null | |
| `postcode` | text null | |
| `delivery_enabled` | boolean | |
| `collection_enabled` | boolean | |
| `booking_enabled` | boolean | |
| `default_delivery_fee_minor` | integer | store as minor units |
| `branding_primary_color` | text null | |
| `branding_accent_color` | text null | |
| `branding_logo_text` | text null | |
| `branding_hero_image_url` | text null | |
| `storefront_content` | jsonb | flexible content replacement for current content docs |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Important note:

- current `settings-content.json` + `storefront-content.json` can be collapsed into relational fields plus `storefront_content jsonb`
- this keeps flexibility without losing structure

### 6.10 `tenant_delivery_zones`

Purpose:

- replace current simple postcode arrays

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `postcode` | text | |
| `delivery_fee_minor` | integer null | override fee per postcode if needed |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, postcode)`

### 6.11 `menu_categories`

Purpose:

- normalized menu categories

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `parent_category_id` | uuid null fk -> menu_categories.id | |
| `name` | text | |
| `slug` | text | unique within tenant |
| `description` | text null | |
| `sort_order` | integer | |
| `is_visible` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, slug)`
- index on `(tenant_id, sort_order)`

### 6.12 `menu_items`

Purpose:

- normalized menu items

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `primary_category_id` | uuid null fk -> menu_categories.id | useful even if many-to-many exists |
| `name` | text | |
| `slug` | text | unique within tenant |
| `description` | text null | |
| `image_url` | text null | |
| `base_price_minor` | integer | |
| `is_featured` | boolean | |
| `is_best_seller` | boolean | |
| `is_available` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, slug)`
- index on `(tenant_id, is_available)`

### 6.13 `menu_item_categories`

Purpose:

- keep the current many-category relationship

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `menu_item_id` | uuid fk -> menu_items.id | |
| `menu_category_id` | uuid fk -> menu_categories.id | |

Primary key:

- `(menu_item_id, menu_category_id)`

### 6.14 `menu_option_groups`

Purpose:

- preserve current option-group behavior from contracts

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `name` | text | |
| `is_required` | boolean | |
| `selection_type` | text | `single`, `multiple` |
| `min_select` | integer | |
| `max_select` | integer | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.15 `menu_option_group_options`

Purpose:

- choices inside an option group

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `option_group_id` | uuid fk -> menu_option_groups.id | |
| `name` | text | |
| `price_delta_minor` | integer | |
| `sort_order` | integer | |

### 6.16 `menu_item_option_groups`

Purpose:

- map menu items to allowed option groups

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `menu_item_id` | uuid fk -> menu_items.id | |
| `option_group_id` | uuid fk -> menu_option_groups.id | |

Primary key:

- `(menu_item_id, option_group_id)`

### 6.17 `orders`

Purpose:

- order header record

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `customer_id` | uuid null fk -> customers.id | null allowed for guest orders |
| `order_number` | text | unique per tenant |
| `fulfillment_type` | text | `delivery`, `collection` |
| `order_status` | text | |
| `payment_status` | text | |
| `payment_method` | text null | `cash`, `stripe`, future providers later |
| `customer_name` | text | snapshot at order time |
| `customer_email` | text | snapshot at order time |
| `customer_phone` | text | snapshot at order time |
| `delivery_address_line_1` | text null | snapshot |
| `delivery_address_line_2` | text null | snapshot |
| `delivery_city` | text null | snapshot |
| `delivery_postcode` | text null | snapshot |
| `subtotal_minor` | integer | |
| `discount_minor` | integer | |
| `delivery_fee_minor` | integer | |
| `total_minor` | integer | |
| `currency_code` | text | |
| `notes` | text null | order-level note |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, order_number)`
- index on `(tenant_id, created_at desc)`
- index on `(tenant_id, order_status, payment_status)`
- index on `(tenant_id, customer_email)`

### 6.18 `order_items`

Purpose:

- each purchased line item

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `order_id` | uuid fk -> orders.id | |
| `menu_item_id` | uuid null fk -> menu_items.id | null allowed if item later removed |
| `item_name` | text | snapshot |
| `quantity` | integer | |
| `unit_price_minor` | integer | snapshot |
| `line_total_minor` | integer | |
| `note` | text null | |
| `sort_order` | integer | |

Indexes:

- index on `(order_id, sort_order)`

### 6.19 `order_item_options`

Purpose:

- selected modifiers/options per ordered item

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `order_item_id` | uuid fk -> order_items.id | |
| `option_group_id` | uuid null fk -> menu_option_groups.id | |
| `option_id` | uuid null fk -> menu_option_group_options.id | |
| `option_group_name` | text | snapshot |
| `option_name` | text | snapshot |
| `price_delta_minor` | integer | snapshot |

### 6.20 `order_delivery_tracking`

Purpose:

- current delivery state for a delivery order

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | uuid pk fk -> orders.id | one active tracking row per order |
| `tracking_token` | text unique | public tracking token |
| `delivery_status` | text | |
| `assigned_driver_user_id` | uuid null fk -> users.id | use `users.user_type = driver` |
| `estimated_ready_at` | timestamptz null | |
| `estimated_delivered_at` | timestamptz null | |
| `dispatched_at` | timestamptz null | |
| `picked_up_at` | timestamptz null | |
| `delivered_at` | timestamptz null | |
| `last_lat` | numeric null | rounded approximate location |
| `last_lng` | numeric null | rounded approximate location |
| `last_location_accuracy_meters` | integer null | |
| `last_location_at` | timestamptz null | |
| `updated_at` | timestamptz | |

### 6.21 `order_tracking_events`

Purpose:

- keep the delivery timeline history that already exists in contracts

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `order_id` | uuid fk -> orders.id | |
| `event_type` | text | |
| `label` | text | snapshot/human label |
| `description` | text null | |
| `created_at` | timestamptz | |

Indexes:

- index on `(order_id, created_at)`

### 6.22 `payments`

Purpose:

- one row per payment attempt or payment record

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `order_id` | uuid fk -> orders.id | |
| `provider` | text | `stripe` now, others later |
| `provider_payment_id` | text | external provider ID |
| `client_secret` | text null | keep carefully, may later move out of long-term storage |
| `status` | text | `pending`, `paid`, `failed`, `refunded` |
| `amount_minor` | integer | |
| `currency_code` | text | |
| `captured_at` | timestamptz null | |
| `refunded_at` | timestamptz null | |
| `failure_reason` | text null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- index on `(tenant_id, order_id)`
- unique index on `(provider, provider_payment_id)`

### 6.23 `printer_devices`

Purpose:

- replace current `printing_stations` naming with a more general device model

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `name` | text | human-readable station/device name |
| `device_type` | text | `windows_print_agent` for now |
| `device_identifier` | text null | current `deviceId` equivalent |
| `token_hash` | text | hashed device token |
| `printer_name` | text null | selected local printer |
| `paper_width` | text | `58mm`, `80mm` |
| `auto_print_enabled` | boolean | |
| `app_version` | text null | |
| `status` | text | `active`, `disabled`, `revoked` |
| `last_seen_at` | timestamptz null | |
| `last_activity_at` | timestamptz null | |
| `last_activity_message` | text null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `token_hash`
- index on `(tenant_id, status)`
- index on `(tenant_id, updated_at desc)`

### 6.24 `print_jobs`

Purpose:

- queue and lifecycle tracking for printed tickets

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | |
| `order_id` | uuid fk -> orders.id | |
| `printer_device_id` | uuid null fk -> printer_devices.id | |
| `job_key` | text | idempotency key |
| `copy_type` | text | `kitchen`, `receipt`, `dispatch` |
| `trigger_type` | text | `auto`, `manual_reprint` |
| `status` | text | |
| `attempt_count` | integer | |
| `copies_printed` | integer | |
| `printer_name` | text null | snapshot |
| `payload_json` | jsonb | preserves current print payload |
| `created_by_user_id` | uuid null fk -> users.id | for manual reprints |
| `claimed_at` | timestamptz null | |
| `started_printing_at` | timestamptz null | |
| `printed_at` | timestamptz null | |
| `last_failed_at` | timestamptz null | |
| `next_retry_at` | timestamptz null | |
| `last_error` | text null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(tenant_id, job_key)`
- index on `(tenant_id, status, created_at)`
- index on `(tenant_id, next_retry_at)`

### 6.25 `order_print_states`

Purpose:

- preserve the print summary the current app uses

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | uuid pk fk -> orders.id | |
| `tenant_id` | uuid fk -> tenants.id | |
| `has_kitchen_print` | boolean | |
| `first_printed_at` | timestamptz null | |
| `last_printed_at` | timestamptz null | |
| `print_count` | integer | |
| `reprint_count` | integer | |
| `last_print_job_id` | uuid null fk -> print_jobs.id | |
| `last_printer_device_id` | uuid null fk -> printer_devices.id | |
| `last_print_status` | text null | |
| `last_print_error` | text null | |
| `updated_at` | timestamptz | |

### 6.26 `subscriptions`

Purpose:

- SaaS billing and plan lifecycle

This table does not exist today, but is required for real SaaS.

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid fk -> tenants.id | one active subscription per tenant usually |
| `provider` | text | `stripe` initially |
| `provider_customer_id` | text null | Stripe customer ID |
| `provider_subscription_id` | text null | Stripe subscription ID |
| `plan_code` | text | internal plan like `starter`, `growth`, `pro` |
| `status` | text | `trialing`, `active`, `past_due`, `cancelled`, `paused` |
| `billing_interval` | text | `monthly`, `yearly` |
| `trial_ends_at` | timestamptz null | |
| `current_period_starts_at` | timestamptz null | |
| `current_period_ends_at` | timestamptz null | |
| `cancel_at_period_end` | boolean | |
| `cancelled_at` | timestamptz null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Indexes:

- unique index on `(provider, provider_subscription_id)`
- index on `(tenant_id, status)`

### 6.27 `audit_logs`

Purpose:

- immutable business and security audit trail

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `tenant_id` | uuid null fk -> tenants.id | null allowed for platform actions |
| `actor_user_id` | uuid null fk -> users.id | optional if actor is known |
| `actor_email` | text null | preserves current behavior |
| `action` | text | e.g. `staff.create`, `menu.update` |
| `target_type` | text | e.g. `user`, `order`, `menu_item` |
| `target_id` | text null | store as text for flexibility |
| `summary` | text | human-readable summary |
| `metadata_json` | jsonb null | structured context |
| `ip_address` | inet null | future-safe |
| `user_agent` | text null | future-safe |
| `created_at` | timestamptz | |

Indexes:

- index on `(tenant_id, created_at desc)`
- index on `(actor_user_id, created_at desc)`

## 7. Recommended Adjacent Tables To Preserve Existing Features

These were not in your minimum list, but the current app already needs them or will need them soon.

- `bookings`
- `drivers` or reuse `users` with `user_type = driver`
- `media_assets`
- `reviews`
- `notifications`
- `contact_inquiries`

Recommendation:

- use `users` for drivers if you want one identity model
- if you want lower migration risk, keep a separate `drivers` table first and merge later

## 8. Repository and Service Layer Design

This is the most important engineering step before migration.

### 8.1 Core idea

Replace direct store calls like this:

```text
route -> getStoredMenuContent()
```

With this:

```text
route -> menuService -> menuRepository
```

### 8.2 Recommended layers

#### Repository interfaces

These define storage operations only.

Example interfaces:

```ts
interface TenantRepository {
  getById(tenantId: string): Promise<TenantRecord | null>;
  getBySlug(slug: string): Promise<TenantRecord | null>;
  getByDomain(hostname: string): Promise<TenantRecord | null>;
  saveSettings(input: SaveTenantSettingsInput): Promise<void>;
}

interface MenuRepository {
  getMenu(tenantId: string): Promise<MenuAggregate>;
  createCategory(input: CreateCategoryInput): Promise<MenuCategoryRecord>;
  createMenuItem(input: CreateMenuItemInput): Promise<MenuItemRecord>;
  updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItemRecord>;
}

interface OrderRepository {
  createOrder(input: CreateOrderInput): Promise<OrderAggregate>;
  getOrderById(tenantId: string, orderId: string): Promise<OrderAggregate | null>;
  listCustomerOrders(tenantId: string, email: string): Promise<OrderAggregate[]>;
  updateOrderStatus(input: UpdateOrderStatusInput): Promise<void>;
  updatePaymentStatus(input: UpdateOrderPaymentStatusInput): Promise<void>;
}
```

#### Service layer

This contains business rules.

Examples:

- `CheckoutService`
- `PaymentService`
- `MenuService`
- `TenantService`
- `PrintingService`
- `StaffService`
- `CustomerAccountService`

Rule of thumb:

- services decide **what should happen**
- repositories decide **how data is stored**

### 8.3 Storage adapters

Create three adapter families:

- `Json*Repository`
- `MongoDocument*Repository` only if needed temporarily
- `Pg*Repository`

Example:

```text
MenuRepository
  -> JsonMenuRepository
  -> PgMenuRepository
```

### 8.4 Repository factory

Use a small factory or container:

```ts
type PersistenceMode =
  | "json"
  | "postgres"
  | "dual_write_json_primary"
  | "dual_write_postgres_primary";
```

That factory returns the correct repository implementation for the current environment.

### 8.5 First repositories to introduce

Recommended order:

1. `TenantRepository`
2. `MenuRepository`
3. `CustomerRepository`
4. `UserRepository`
5. `OrderRepository`
6. `PaymentRepository`
7. `PrintRepository`
8. `AuditLogRepository`

## 9. How To Keep The Existing App Working

This is the safest migration strategy.

### Phase 1: No behavior change

- add repository interfaces
- implement JSON repositories first
- make services call JSON repositories
- keep current APIs and pages unchanged

Result:

- app still behaves exactly the same
- persistence is now behind an abstraction

### Phase 2: Add PostgreSQL in parallel

- add PostgreSQL migrations
- add PostgreSQL repository implementations
- do not switch reads yet
- optionally shadow-write selected entities

Result:

- you can validate the new schema without risking the live prototype behavior

### Phase 3: Controlled dual-write

- JSON remains primary
- PostgreSQL receives shadow writes for selected entities
- compare JSON and SQL outputs during testing

Best first dual-write candidates:

- tenants
- users
- customers
- menu categories
- menu items

Do **not** start with orders/payments first unless you add good test coverage.

### Phase 4: Read cutover by module

Recommended cutover order:

1. tenants and settings
2. staff/users
3. customers
4. menu
5. orders
6. payments
7. printing
8. audit logs

### Phase 5: JSON retirement

Only after approval and successful validation:

- stop JSON writes
- archive JSON files
- remove JSON adapters

Not now.

## 10. Migration Plan

This is the practical rollout plan.

### Step A: Schema bootstrap

Create migrations for:

- core tenant tables
- auth tables
- menu tables
- order tables
- payment tables
- print tables
- audit tables
- domain and subscription tables

### Step B: Seed and mapping plan

Map existing JSON/Mongo data into new SQL tables:

- `settings-content.json` -> `tenants`, `tenant_settings`, `tenant_delivery_zones`
- `storefront-content.json` -> `tenant_settings.storefront_content`
- `menu-content.json` -> `menu_categories`, `menu_items`
- `customer-users.json` -> `customers`
- `extadmin-users.json` -> `users`, `roles`, `user_roles`
- `operations-content.json` -> `orders`, `order_items`, `bookings`, tracking tables
- `payments-content.json` -> `payments`
- `printing-content.json` -> `printer_devices`, `print_jobs`, `order_print_states`
- `audit-log.json` -> `audit_logs`

### Step C: Backfill scripts

Future scripts should be written as:

- read old store
- transform into normalized SQL rows
- insert in dependency order
- write an id-mapping table where needed
- run in dry-run mode first

Recommended migration helper tables:

- `migration_runs`
- `migration_entity_maps`

Example `migration_entity_maps` use:

- old JSON `order_abc123` -> new SQL UUID
- old JSON `staff_1` -> new SQL UUID

### Step D: Validation

Validate counts and sample records:

- tenant count
- user count
- customer count
- category count
- item count
- order count
- payment count
- print job count

Also validate business correctness:

- order totals match
- customer order history still works
- print jobs still point to the right orders
- staff login accounts map correctly

## 11. Suggested Service Mapping From Current Code

Current modules can be evolved into services like this:

| Current module | Suggested future service | Suggested repository |
| --- | --- | --- |
| `settings-store.ts` | `TenantService` | `TenantRepository` |
| `content-store.ts` | `StorefrontService` | `TenantRepository` or `StorefrontRepository` |
| `menu-store.ts` | `MenuService` | `MenuRepository` |
| `operations-store.ts` | `OrderService`, `BookingService`, `DeliveryTrackingService` | `OrderRepository`, `BookingRepository` |
| `payments-store.ts` | `PaymentService` | `PaymentRepository` |
| `extadmin-user-store.ts` | `StaffService` | `UserRepository`, `RoleRepository` |
| `customer-user-store.ts` | `CustomerAccountService` | `CustomerRepository` |
| `printing-store.ts` | `PrintQueueService` | `PrintRepository` |
| `audit-store.ts` | `AuditLogService` | `AuditLogRepository` |

## 12. Recommended Technology Choice For Implementation

Recommended implementation stack:

- PostgreSQL
- migration tool: **Drizzle Kit** or **Prisma Migrate**
- query layer: **Drizzle ORM** or **Kysely**

Recommendation for this repo:

- **Drizzle ORM + PostgreSQL**

Why:

- good TypeScript ergonomics
- explicit SQL-like schema
- lower magic than Prisma
- easier to reason about for multi-tenant indexes and staged migrations

If you prefer stronger generated client workflows, Prisma is also acceptable.

## 13. Risks To Watch During Migration

- If repositories are introduced too late, JSON logic will stay spread across the app.
- If orders are migrated before menu/customers/users are stable, referential data can get messy.
- If dual-write starts without idempotency, duplicate orders or payments can happen.
- If tenant lookup is not fixed early, data may be written to the wrong tenant.
- If driver identity remains weak, delivery updates may still be insecure even after database migration.

## 14. Recommended Implementation Order After Approval

If you approve implementation later, the safest order is:

1. add database package/config and migrations
2. introduce repository interfaces
3. wrap existing JSON code in repository adapters
4. move route code to service layer
5. add PostgreSQL adapters
6. enable dual-write for low-risk entities
7. validate
8. migrate higher-risk entities like orders/payments/printing

## 15. Final Recommendation

Best practical path:

- do **not** rip out JSON now
- do **not** migrate data yet
- first add repository interfaces and service boundaries
- use PostgreSQL as the new source-of-truth target
- normalize transactional data
- keep flexible storefront content in `jsonb` where it helps
- roll out entity-by-entity behind a persistence mode switch

In beginner-friendly terms:

The safest rebuild is to put a new storage layer **under** the current app before changing the app’s behavior. That way, the screens and APIs can keep working while the database foundation becomes production-ready behind the scenes.
