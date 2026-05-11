# Payment Flow

## Overview

The system supports two payment methods: **cash** and **card** (Stripe). Each follows a separate flow.

## Cash Flow

1. Customer selects "Cash on delivery or collection" at checkout
2. Frontend sends `POST /api/v1/public/checkout` with `paymentMethod: "cash"`
3. Server creates order with `orderStatus: "placed"`, `paymentStatus: "pending"`
4. Server creates auto-print job for kitchen
5. Frontend redirects to `/checkout/success`

Cash payment is collected in person during delivery or at the counter during collection.

## Card Flow (Stripe)

1. Customer selects "Pay online by card" at checkout
2. Frontend sends `POST /api/v1/public/checkout` with `paymentMethod: "stripe"`
3. Server creates order with `orderStatus: "pending_payment"`, `paymentStatus: "pending"`
4. Server returns `orderId` and `totalMinor` (total in pence)
5. Frontend sends `POST /api/v1/public/payments/intent` with `orderId` only
6. Server loads order, verifies `pending_payment` status, derives amount from `order.total`
7. Server creates Stripe PaymentIntent and returns `clientSecret`
8. Frontend renders Stripe EmbeddedCheckout using `clientSecret`
9. Customer enters card details in Stripe Elements iframe
10. Stripe processes payment
11. Stripe sends webhook `payment_intent.succeeded` to `POST /api/v1/webhooks/stripe`
12. Webhook verifies signature using `STRIPE_WEBHOOK_SECRET`
13. Server updates payment status to `paid`, order status to `placed`
14. Server creates auto-print job for kitchen
15. Stripe redirects customer to `onComplete` callback
16. Frontend redirects to `/checkout/success`

### Test Mode

When `STRIPE_SECRET_KEY` is not configured:
- PaymentIntent creation returns a mock `pi_mock_*` ID
- Frontend detects mock client secret and redirects to success without showing card form
- No webhook is sent (server treats mock as immediate success)

When `STRIPE_SECRET_KEY` starts with `sk_test_`:
- Stripe test mode is active
- Use Stripe test cards (e.g., `4242 4242 4242 4242`)
- Webhooks must be configured via Stripe CLI for local testing

## Webhook Security

- In **production**: `STRIPE_WEBHOOK_SECRET` is required. Webhooks without valid signature are rejected with 400.
- In **development**: If `STRIPE_WEBHOOK_SECRET` is not set, webhook payloads are parsed as JSON with a console warning.
- Idempotency: If a `payment_intent.succeeded` webhook arrives for a payment already marked `paid`, it is acknowledged without reprocessing.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | For card payments | Stripe secret key (`sk_live_*` or `sk_test_*`) |
| `STRIPE_WEBHOOK_SECRET` | For production webhooks | From Stripe Dashboard webhook endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For card payments | Stripe publishable key (`pk_live_*` or `pk_test_*`) |

## Key Files

| File | Purpose |
|---|---|
| `apps/web/src/lib/payments.ts` | Stripe client, PaymentIntent creation, webhook verification |
| `apps/web/src/lib/payments-store.ts` | Payment record storage (JSON/Mongo) |
| `apps/web/src/lib/checkout-calculator.ts` | Server-side order pricing |
| `apps/web/src/app/api/v1/public/checkout/route.ts` | Order creation (cash + card) |
| `apps/web/src/app/api/v1/public/payments/intent/route.ts` | PaymentIntent creation |
| `apps/web/src/app/api/v1/public/payments/confirm/route.ts` | Payment status polling |
| `apps/web/src/app/api/v1/webhooks/stripe/route.ts` | Stripe webhook handler |
| `apps/web/src/components/cart-ui.tsx` | Checkout UI with Stripe EmbeddedCheckout |

## Security Rules

1. Payment amount is always derived from server-side order calculation, never from frontend input
2. `tenantId` is always resolved from domain/session, never from request body
3. Card orders start as `pending_payment` and only become `placed` after Stripe confirmation
4. Cash orders start as `placed` immediately
5. Print jobs are only created after order status becomes `placed`
