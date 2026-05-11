# Printing Software PRD and Technical Specification

## 1. Document Purpose

This document defines the product requirements and technical specification for a restaurant order printing system for this repository.

The goal is to build a Windows-first local printing application that receives newly confirmed orders from this project and prints them automatically to a POS thermal printer.

This specification is tailored to the current codebase, not a generic restaurant system.

## 2. Current Project Context

This repository is a restaurant commerce application with:

- public storefront and checkout
- restaurant admin (`extadmin`)
- driver workflows
- order storage and order status management
- payment confirmation flow

Relevant existing files:

- `packages/contracts/src/index.ts`
- `apps/web/src/app/api/v1/public/checkout/route.ts`
- `apps/web/src/app/api/v1/public/payments/intent/route.ts`
- `apps/web/src/app/api/v1/public/payments/confirm/route.ts`
- `apps/web/src/app/api/v1/webhooks/stripe/route.ts`
- `apps/web/src/lib/operations-store.ts`
- `apps/web/src/app/extadmin/orders/page.tsx`
- `apps/web/src/components/extadmin.tsx`

## 3. Existing Order and Payment Behavior

### 3.1 Order creation

Orders are currently created in `apps/web/src/app/api/v1/public/checkout/route.ts`.

Important current behavior:

- an order is created immediately during checkout
- `cash` orders are created with:
  - `orderStatus = "placed"`
  - `paymentStatus = "pending"`
- `card` orders are created with:
  - `orderStatus = "pending_payment"`
  - `paymentStatus = "pending"`

### 3.2 Payment confirmation

Card payments are later confirmed in:

- `apps/web/src/app/api/v1/public/payments/confirm/route.ts`
- `apps/web/src/app/api/v1/webhooks/stripe/route.ts`

When payment succeeds, the current system updates:

- `paymentStatus = "paid"`
- `orderStatus = "placed"`

### 3.3 Why this matters for printing

The printing system must not print card orders when they are first created, because they are initially `pending_payment`.

Printing must happen only when the order is considered operationally confirmed.

## 4. Product Goal

Build a local restaurant print agent that:

- runs on a Windows PC in the restaurant
- connects to this application securely
- detects newly confirmed orders
- prints them automatically to a POS printer
- avoids duplicate prints
- supports retries and reprints
- logs all print outcomes

## 5. Product Objectives

### 5.1 Primary objectives

- print every eligible order exactly once by default
- print within a few seconds of order confirmation
- prevent duplicate kitchen tickets
- keep printing working even if the printer temporarily disconnects
- allow staff to reprint any order from admin

### 5.2 Secondary objectives

- support multiple print stations later
- support multiple copy types later
- support kitchen-only MVP first
- support local monitoring and troubleshooting

## 6. Non-Goals for MVP

The first version should not require:

- Linux or macOS support
- complex kitchen routing by product category
- cloud-managed printer discovery
- direct USB driver installation from the app
- invoice-grade tax accounting
- multilingual receipt templates

## 7. Users

### 7.1 Primary user

Restaurant staff using a Windows PC connected to a thermal printer.

### 7.2 Secondary user

Restaurant owner/admin using the `extadmin` panel to:

- view print state
- manually reprint
- diagnose failures

## 8. Functional Requirements

### 8.1 Confirmed-order printing

The system must automatically print an order when it becomes eligible for production.

Eligibility rules:

- `cash` orders:
  - print when `orderStatus = "placed"`
- `card` orders:
  - print only when `paymentStatus = "paid"` and `orderStatus = "placed"`

The system must not auto-print orders in these states:

- `pending_payment`
- `cancelled`
- `refunded`
- failed payment cases

### 8.2 Duplicate prevention

The system must prevent duplicate auto-printing of the same order copy.

By default:

- one eligible order creates one kitchen print job
- retries must not create duplicate successful prints
- reprints must be explicit and tracked separately

### 8.3 Manual reprint

Admin users must be able to trigger a reprint for an order from the restaurant admin UI.

Reprint requirements:

- record who triggered it if session identity is available
- increment reprint count
- mark the print job as `reprint`
- allow choosing copy type in future versions

### 8.4 Local print queue

The agent must keep a queue of jobs with states:

- `pending`
- `claimed`
- `printing`
- `printed`
- `failed`
- `cancelled`

### 8.5 Failure handling

If printing fails, the system must:

- store failure reason
- retry automatically with backoff
- show failed job in agent UI
- allow manual retry

### 8.6 Printer management

The agent must allow:

- selecting an installed printer
- choosing paper width
- running a test print
- enabling/disabling auto-print
- naming the station

### 8.7 Startup and background behavior

The agent should:

- start automatically with Windows
- minimize to system tray
- continue polling/streaming while minimized

## 9. Recommended Solution Architecture

## 9.1 High-level architecture

Use a split architecture:

1. `apps/web` remains the source of truth for orders, payment state, and print job state
2. a separate local `print agent` runs in the restaurant on Windows
3. the agent connects to server APIs to fetch or receive eligible print jobs
4. the agent prints via ESC/POS to a thermal printer

## 9.2 Recommended integration mode

Recommended MVP: `polling`

Why polling is recommended first:

- simplest to build reliably
- works well with local Windows agent
- avoids complexity of public inbound networking to the restaurant PC
- easy to debug

Polling interval:

- every `3 seconds` in MVP

Future option:

- SSE stream or WebSocket after MVP stabilization

## 9.3 Recommended technology stack for the print agent

- Electron
- Node.js
- TypeScript
- local config via `electron-store` or SQLite
- ESC/POS library such as `escpos`, `@node-escpos/core`, or equivalent

Windows is the only required platform in MVP.

## 10. Domain Model

## 10.1 Existing order model

Current shared order model is defined in `packages/contracts/src/index.ts`.

Important fields already available:

- `id`
- `tenantId`
- `orderNumber`
- `customerName`
- `customerEmail`
- `customerPhone`
- `fulfillmentType`
- `address`
- `items`
- `subtotal`
- `deliveryFee`
- `discount`
- `total`
- `orderStatus`
- `paymentStatus`
- `createdAt`

## 10.2 New printing data model

The printing system should introduce the following domain objects.

### PrintStation

Represents one local agent installation.

Suggested fields:

- `id: string`
- `tenantId: string`
- `name: string`
- `tokenHash: string`
- `enabled: boolean`
- `deviceId?: string`
- `printerName?: string`
- `paperWidth: "58mm" | "80mm"`
- `autoPrintEnabled: boolean`
- `createdAt: string`
- `updatedAt: string`
- `lastSeenAt?: string`

### PrintJob

Represents a single print attempt request.

Suggested fields:

- `id: string`
- `tenantId: string`
- `orderId: string`
- `orderNumber: string`
- `stationId?: string`
- `copyType: "kitchen" | "receipt" | "dispatch"`
- `triggerType: "auto" | "manual_reprint"`
- `status: "pending" | "claimed" | "printing" | "printed" | "failed" | "cancelled"`
- `attemptCount: number`
- `lastError?: string`
- `claimedAt?: string`
- `startedPrintingAt?: string`
- `printedAt?: string`
- `createdAt: string`
- `updatedAt: string`
- `createdBy?: string`

### OrderPrintState

Tracks summary print state at the order level.

Suggested fields:

- `orderId: string`
- `tenantId: string`
- `hasKitchenPrint: boolean`
- `firstPrintedAt?: string`
- `lastPrintedAt?: string`
- `printCount: number`
- `lastPrintJobId?: string`
- `lastStationId?: string`

## 11. Print Eligibility Rules

The server must centralize the eligibility logic in one place.

Recommended helper:

- `isOrderEligibleForAutoPrint(order): boolean`

Suggested rules:

1. return `false` if order is missing
2. return `false` if order has already received the default kitchen auto-print
3. return `false` if `orderStatus` is `cancelled` or `refunded`
4. return `true` for cash-like flow when `orderStatus = "placed"` and no successful auto-print exists
5. return `true` for card flow only when:
   - `orderStatus = "placed"`
   - `paymentStatus = "paid"`
   - and no successful auto-print exists

Note:

This project does not currently store a dedicated `paymentMethod` on the order. That should be added if the implementation needs explicit flow distinction.

Recommended addition to `Order`:

- `paymentMethod?: "cash" | "stripe"`

This should be set at creation time in the checkout route.

## 12. Receipt / Ticket Content Specification

## 12.1 Kitchen ticket content

The kitchen ticket should contain:

- restaurant name
- order number in large text
- date and time
- fulfillment type: `DELIVERY` or `COLLECTION`
- payment label:
  - `PAID`
  - `CASH DUE`
- customer name
- customer phone
- delivery address if fulfillment is `delivery`
- each order line:
  - quantity
  - item name
  - selected options
  - note if present
- subtotal
- delivery fee
- discount
- total
- optional footer:
  - `Print #1`
  - station name

## 12.2 Formatting rules

- support `58mm` and `80mm`
- use ESC/POS formatting
- bold order number
- emphasize fulfillment type
- auto-cut paper if supported
- avoid depending on graphics in MVP

## 12.3 Example text output

```text
Bella Roma
ORDER BR-1058
2026-04-23 14:12

DELIVERY
PAID

Customer: John Doe
Phone: +44 7000 000000
Address: 12 Sample Road

2 x Margherita Pizza
1 x Garlic Bread

Subtotal: 21.00
Delivery: 3.50
Discount: 0.00
TOTAL: 24.50

Print #1
Kitchen Station
```

## 13. Server-Side Integration Points in This Repo

## 13.1 Checkout route

File:

- `apps/web/src/app/api/v1/public/checkout/route.ts`

Responsibilities to add:

- record `paymentMethod` on order
- create auto print job for cash orders after successful order creation

Rules:

- if `paymentMethod === "cash"` and order status is `placed`, create print job immediately
- if `paymentMethod === "card"`, do not create print job here

## 13.2 Payment confirm route

File:

- `apps/web/src/app/api/v1/public/payments/confirm/route.ts`

Responsibilities to add:

- after payment success and order state update to `paid` + `placed`, create print job if not already created

## 13.3 Stripe webhook route

File:

- `apps/web/src/app/api/v1/webhooks/stripe/route.ts`

Responsibilities to add:

- on `payment_intent.succeeded`, create print job after updating order/payment state
- ensure idempotency so duplicate Stripe webhook delivery does not create duplicate print jobs

## 13.4 Operations store

File:

- `apps/web/src/lib/operations-store.ts`

Recommended change:

- keep printing logic outside the low-level order storage helper where possible
- use a dedicated printing service module so order persistence and print orchestration stay separate

Recommended new modules:

- `apps/web/src/lib/printing-store.ts`
- `apps/web/src/lib/printing-service.ts`
- `apps/web/src/lib/printing-types.ts`

## 14. API Specification

The server must expose secure endpoints for the print agent and admin workflows.

All printing endpoints should live under:

- `apps/web/src/app/api/v1/printing/...`

## 14.1 Agent authentication

Use station token authentication.

Recommended header:

- `Authorization: Bearer <station-token>`

The token maps to one `PrintStation`.

## 14.2 `POST /api/v1/printing/stations/register`

Purpose:

- initial pairing or station setup

Request:

```json
{
  "tenantId": "tenant_bella",
  "name": "Kitchen Station 1",
  "deviceId": "windows-machine-guid",
  "printerName": "EPSON TM-T82X",
  "paperWidth": "80mm"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "stationId": "station_123",
    "token": "plain-text-station-token-once",
    "name": "Kitchen Station 1"
  },
  "meta": {},
  "error": null
}
```

## 14.3 `POST /api/v1/printing/stations/heartbeat`

Purpose:

- update `lastSeenAt`
- optionally update current printer info

Request:

```json
{
  "printerName": "EPSON TM-T82X",
  "appVersion": "1.0.0",
  "autoPrintEnabled": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "stationId": "station_123",
    "serverTime": "2026-04-23T08:30:00.000Z"
  },
  "meta": {},
  "error": null
}
```

## 14.4 `GET /api/v1/printing/jobs/next`

Purpose:

- polling endpoint for the agent

Behavior:

- returns zero or more claimable jobs for that authenticated station
- can also atomically claim one job during response generation

Query params:

- none required for MVP if station identity comes from token

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "print_job_123",
      "orderId": "order_abc",
      "orderNumber": "BR-1058",
      "copyType": "kitchen",
      "triggerType": "auto",
      "createdAt": "2026-04-23T08:31:00.000Z",
      "payload": {
        "restaurantName": "Bella Roma",
        "orderNumber": "BR-1058",
        "createdAt": "2026-04-23T08:31:00.000Z",
        "paymentStatus": "paid",
        "paymentMethod": "stripe",
        "fulfillmentType": "delivery",
        "customerName": "John Doe",
        "customerPhone": "+44 7000 000000",
        "address": "12 Sample Road",
        "items": [
          {
            "name": "Margherita Pizza",
            "quantity": 2,
            "unitPrice": 9.5,
            "selectedOptions": [],
            "note": ""
          }
        ],
        "subtotal": 19,
        "deliveryFee": 3.5,
        "discount": 0,
        "total": 22.5
      }
    }
  ],
  "meta": {},
  "error": null
}
```

## 14.5 `POST /api/v1/printing/jobs/:id/ack`

Purpose:

- mark job as claimed by station

Request:

```json
{
  "stationId": "station_123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "print_job_123",
    "status": "claimed"
  },
  "meta": {},
  "error": null
}
```

## 14.6 `POST /api/v1/printing/jobs/:id/printing`

Purpose:

- indicate actual print start

## 14.7 `POST /api/v1/printing/jobs/:id/printed`

Purpose:

- mark successful print

Request:

```json
{
  "printerName": "EPSON TM-T82X",
  "copiesPrinted": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "print_job_123",
    "status": "printed",
    "printedAt": "2026-04-23T08:31:04.000Z"
  },
  "meta": {},
  "error": null
}
```

## 14.8 `POST /api/v1/printing/jobs/:id/failed`

Purpose:

- mark print failure

Request:

```json
{
  "error": "Printer offline or unavailable"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "print_job_123",
    "status": "failed"
  },
  "meta": {},
  "error": null
}
```

## 14.9 `POST /api/v1/printing/orders/:orderId/reprint`

Purpose:

- admin/manual reprint trigger

Request:

```json
{
  "copyType": "kitchen",
  "reason": "Requested by kitchen staff"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "print_job_456",
    "triggerType": "manual_reprint"
  },
  "meta": {},
  "error": null
}
```

## 15. Agent Specification

## 15.1 Agent responsibilities

The local desktop app must:

- authenticate as a print station
- poll every 3 seconds for new jobs
- render jobs into ESC/POS output
- send job lifecycle updates back to server
- show queue and status to local staff
- support test print

## 15.2 Recommended folder structure for a separate agent app

```text
printing-agent/
  package.json
  src/
    main/
      main.ts
      tray.ts
      autostart.ts
      printer-service.ts
      job-runner.ts
      api-client.ts
      settings-store.ts
    renderer/
      app.tsx
      pages/
        dashboard.tsx
        settings.tsx
        history.tsx
      components/
        queue-list.tsx
        printer-selector.tsx
```

## 15.3 Agent UI requirements

Required screens:

- Dashboard
  - connection state
  - printer state
  - current queue
  - recent printed jobs
- Settings
  - server base URL
  - station token
  - printer selection
  - paper width
  - auto-print on/off
  - launch on startup
- History
  - recent successes
  - failures
  - retry action

## 15.4 Local configuration

The agent should persist:

- server base URL
- station token
- station name
- selected printer
- paper width
- auto-print enabled
- launch on startup

## 15.5 Queue processing rules

1. poll server
2. fetch next available jobs
3. claim or confirm ownership
4. mark job as `printing`
5. send output to printer
6. on success, call `printed`
7. on failure, call `failed`
8. schedule retry locally and/or rely on server retry rules

## 16. Admin UI Specification

The restaurant admin should expose print controls in the orders page.

Likely integration points:

- `apps/web/src/app/extadmin/orders/page.tsx`
- `apps/web/src/components/extadmin.tsx`

Required additions:

- show whether an order has been printed
- show print count
- show last printed time
- show last print error if latest job failed
- add `Reprint` action

MVP UI requirement:

- one `Reprint kitchen ticket` button per order is enough

## 17. Security Requirements

## 17.1 Station authentication

Each agent must authenticate with a unique station token.

Requirements:

- store token hash on server, not plain text
- only return plain text token once during registration/pairing
- reject requests from disabled stations

## 17.2 Endpoint authorization

- public endpoints must not expose print job internals
- print endpoints must require station token or admin session
- reprint endpoint must require authenticated admin session

## 17.3 Auditability

The system should log:

- job creation
- claim
- print success
- print failure
- reprint trigger

## 18. Reliability and Idempotency

## 18.1 Idempotent print-job creation

The system must ensure that the same order does not generate duplicate auto-print jobs due to:

- repeated payment webhooks
- repeated frontend payment confirmation
- retry logic
- page refreshes

Recommended rule:

- for auto printing, only one active or successful kitchen job may exist per order unless explicitly reprinted

## 18.2 Idempotent job completion

If the agent retries `printed` due to temporary network issues, the server should treat repeated success reports safely.

## 18.3 Multi-agent future safety

Even if MVP runs one station, the API design should support safe claiming so multiple stations do not print the same job accidentally.

Recommended behavior:

- atomically claim pending jobs
- store `stationId`, `claimedAt`
- expire stale claims if needed later

## 19. Failure Scenarios and Expected Behavior

### 19.1 Printer offline

Expected behavior:

- agent marks job failed
- server records error
- job becomes retryable
- local UI shows failure

### 19.2 Server unreachable

Expected behavior:

- agent shows disconnected state
- retry polling automatically
- local app stays open and resumes when connection returns

### 19.3 Duplicate webhook delivery

Expected behavior:

- server updates order idempotently
- no duplicate auto-print jobs created

### 19.4 Order cancelled after print

Expected behavior:

- no unprint action required
- admin should still see that order had already been printed

## 20. Suggested Server-Side Implementation Plan

## 20.1 New shared types

Add printing types either to `packages/contracts` or app-local types.

Recommended new types:

- `PrintStation`
- `PrintJob`
- `PrintCopyType`
- `PrintJobStatus`

## 20.2 New server modules

Suggested files:

- `apps/web/src/lib/printing-store.ts`
- `apps/web/src/lib/printing-service.ts`
- `apps/web/src/lib/printing-auth.ts`

Suggested responsibilities:

- `printing-store.ts`
  - CRUD for stations and print jobs
- `printing-service.ts`
  - eligibility checks
  - create auto-print jobs
  - create manual reprints
  - claim jobs
  - update job states
- `printing-auth.ts`
  - station token validation

## 20.3 New API routes

Suggested route files:

- `apps/web/src/app/api/v1/printing/stations/register/route.ts`
- `apps/web/src/app/api/v1/printing/stations/heartbeat/route.ts`
- `apps/web/src/app/api/v1/printing/jobs/next/route.ts`
- `apps/web/src/app/api/v1/printing/jobs/[id]/ack/route.ts`
- `apps/web/src/app/api/v1/printing/jobs/[id]/printing/route.ts`
- `apps/web/src/app/api/v1/printing/jobs/[id]/printed/route.ts`
- `apps/web/src/app/api/v1/printing/jobs/[id]/failed/route.ts`
- `apps/web/src/app/api/v1/printing/orders/[id]/reprint/route.ts`

## 20.4 Event hooks to add

Invoke print orchestration from:

- checkout success for cash orders
- payment confirm success for card orders
- Stripe webhook success for card orders

Suggested server-side helper:

- `ensureAutoPrintJobForOrder(tenantId, orderId)`

This helper should:

1. load the order
2. evaluate print eligibility
3. check for existing auto kitchen job
4. create exactly one auto kitchen job if eligible

## 21. Suggested Agent Build Plan

## 21.1 Phase 1: foundations

- scaffold Electron app
- add settings storage
- add server API client
- add printer discovery and test print

## 21.2 Phase 2: job execution

- poll `/printing/jobs/next`
- render kitchen tickets
- send `printing`, `printed`, `failed` updates
- show queue and history

## 21.3 Phase 3: production hardening

- tray mode
- startup on boot
- retry logic
- heartbeat
- better failure diagnostics

## 22. MVP Acceptance Criteria

The MVP is complete when all of the following are true:

1. cash orders print automatically within 5 seconds of successful order placement
2. card orders print automatically within 5 seconds of payment success
3. pending card orders do not print
4. a printer outage creates a visible failed job without crashing the app
5. the agent can retry failed jobs
6. admin can manually reprint an order
7. duplicate Stripe confirmations do not create duplicate prints
8. the printed ticket includes order number, fulfillment type, customer details, items, and total

## 23. Open Design Decisions

These should be decided before implementation starts:

### 23.1 Where to store printing data

Options:

- alongside current app-local JSON/Mongo hybrid pattern
- fully in Mongo if production infra is ready

Recommendation:

- follow the existing tenant document pattern so printing data can use the same persistence strategy as other content

### 23.2 Whether to add `paymentMethod` to orders

Recommendation:

- yes, add it

Reason:

- printing logic becomes explicit and less error-prone

### 23.3 Whether to support multiple stations in MVP

Recommendation:

- no complex routing in MVP
- design APIs safely for multi-station later
- operationally deploy one station first

## 24. Delivery Sequence for an AI or Developer

Give the builder this sequence:

1. add printing types and persistence
2. add server-side print service with idempotent job creation
3. add printing API routes
4. integrate print triggers into checkout and payment success flows
5. add admin reprint action and print status display
6. build Electron print agent
7. connect agent to polling API
8. implement ESC/POS formatter and test print
9. add retry and failure logging
10. verify end-to-end with both cash and card flows

## 25. Build Prompt for Another AI

Use this prompt with another AI builder:

```text
Build a production-structured printing system for my restaurant commerce project.

Repository context:
- Next.js app in apps/web
- shared contracts in packages/contracts
- orders created in apps/web/src/app/api/v1/public/checkout/route.ts
- order persistence in apps/web/src/lib/operations-store.ts
- card payment confirmation in:
  - apps/web/src/app/api/v1/public/payments/confirm/route.ts
  - apps/web/src/app/api/v1/webhooks/stripe/route.ts
- admin orders UI in:
  - apps/web/src/app/extadmin/orders/page.tsx
  - apps/web/src/components/extadmin.tsx

Business rules:
- cash orders print when orderStatus becomes "placed"
- card orders print only when paymentStatus becomes "paid" and orderStatus becomes "placed"
- never print pending_payment, cancelled, refunded, or failed-payment orders
- prevent duplicate auto-prints
- support manual reprint from admin
- store print job history and failures

What to build:
1. Printing data model for stations and print jobs
2. Server-side printing service with idempotent job creation
3. API routes under /api/v1/printing
4. Admin reprint UI and print status indicators
5. Separate Windows-first Electron print agent
6. Polling-based job retrieval
7. ESC/POS formatter for 58mm and 80mm printers
8. Queue, retry, and failure handling

Technical expectations:
- Use TypeScript
- Keep code modular and production-structured
- Do not use pseudocode
- Reuse the existing code style and route conventions
- Make printing logic explicit and testable
- Add paymentMethod to orders if needed for correct print eligibility

Deliver:
- code
- file-by-file explanation
- setup instructions
- env vars
- manual test checklist for cash and card order flows
```

## 26. Recommended First MVP Scope

To reduce risk, the first release should include only:

- one Windows print agent
- one kitchen printer
- one copy type: `kitchen`
- polling every 3 seconds
- manual reprint from admin
- print history and failure log

Anything beyond that should come after the first working deployment.
