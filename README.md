# Restaurant Commerce Cloud

Multi-tenant SaaS foundation for restaurant storefronts, restaurant admin, and platform super admin.

## Apps

- `apps/web`: Next.js application serving the storefront, restaurant admin, super admin, and API routes

## Packages

- `packages/contracts`: shared domain contracts and mock seed data types

## Quick start

1. `npm install`
2. `npm run dev`

## Current status

This repository includes:

- multi-tenant route and data model foundation
- customer storefront pages
- restaurant admin dashboard pages
- platform super admin pages
- API route handlers for tenants, menu, orders, bookings, auth, and payments
- a payment provider abstraction with Stripe-oriented interfaces

Persistence, authentication hardening, queues, and external integrations are scaffolded conceptually and represented in code boundaries, but still need full production infrastructure wiring.
