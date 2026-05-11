# Printing System

## Overview

The printing system connects the restaurant ordering platform to physical POS printers via an Electron-based Windows desktop agent. It uses a polling architecture — the agent polls the server for print jobs every 3 seconds.

**Components:**
- **Server** (Next.js API routes) — manages print stations, jobs, and order print state
- **Electron Print Agent** (Windows desktop app) — polls server, renders tickets, sends to Windows printers
- **POS Printer** — thermal receipt printer (58mm or 80mm paper)

## Print Job Lifecycle

```
Order placed (cash or card paid)
  → Server creates auto print job (status: pending)
  → Agent polls GET /printing/jobs/next
  → Agent claims job (POST /printing/jobs/:id/ack → status: claimed)
  → Agent starts printing (POST /printing/jobs/:id/printing → status: printing)
  → Success: POST /printing/jobs/:id/printed → status: printed
  → Failure: POST /printing/jobs/:id/failed → status: failed, retry scheduled
```

### Statuses

| Status | Description |
|---|---|
| `pending` | Created, waiting for any station to claim |
| `claimed` | Station has picked up the job |
| `printing` | Station is actively printing |
| `printed` | Successfully printed |
| `failed` | Print failed, retry scheduled via `nextRetryAt` |
| `cancelled` | Cancelled by operator (extadmin) |

### Claim Timeout

If a station crashes after claiming a job, the job would be stuck as "claimed" forever. To prevent this, jobs that have been in `claimed` or `printing` status for more than **5 minutes** are automatically treated as reclaimable. The next station that polls for jobs can pick them up.

### Retry System

Failed jobs are retried with exponential backoff:
- Retry delay: `attemptCount × 30 seconds`, capped at 300 seconds (5 minutes)
- Failed jobs with expired `nextRetryAt` appear in the job queue again
- The agent automatically re-attempts them if auto-print is enabled

## Station Registration

1. Restaurant owner configures server URL and registration key in the Electron agent
2. Agent sends `POST /printing/stations/register` with the registration key
3. Server creates/renews a station record and returns a `pst_` token
4. Agent stores the token and uses it for all subsequent API calls (Bearer auth)
5. Agent sends heartbeats every 15 seconds

### Station Connection Status

Derived from `lastSeenAt` heartbeat timestamp:
- **Online**: heartbeat within last 60 seconds
- **Stale**: heartbeat within last 5 minutes
- **Offline**: no heartbeat for 5+ minutes

### Activate/Deactivate

Stations can be activated or deactivated via `POST /printing/stations/:id/toggle`. Deactivated stations cannot authenticate and won't receive jobs.

## API Reference

### Station Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/printing/stations/register` | ExtAdmin or registration key | Register or renew a station |
| POST | `/api/v1/printing/stations/heartbeat` | Station token | Send heartbeat + update config |
| POST | `/api/v1/printing/stations/:id/toggle` | ExtAdmin | Activate or deactivate station |

### Job Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/printing/jobs/next` | Station token | Get next available jobs |
| POST | `/api/v1/printing/jobs/:id/ack` | Station token | Claim a job |
| POST | `/api/v1/printing/jobs/:id/printing` | Station token | Mark as printing |
| POST | `/api/v1/printing/jobs/:id/printed` | Station token | Mark as printed |
| POST | `/api/v1/printing/jobs/:id/failed` | Station token | Mark as failed |
| POST | `/api/v1/printing/jobs/:id/cancel` | ExtAdmin | Cancel a pending/failed job |

### Reprint Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/printing/orders/:id/reprint` | ExtAdmin | Create a manual reprint job |

## Electron Agent

### Configuration

The agent stores settings in `%APPDATA%/rcc-print-agent/print-agent-state.json`:

| Setting | Description |
|---|---|
| `serverUrl` | Platform server URL (e.g. `https://restaurant.example.com`) |
| `tenantId` | Tenant to connect to |
| `stationName` | Display name (e.g. "Kitchen Station 1") |
| `registrationKey` | One-time key for initial pairing |
| `stationToken` | Auth token (auto-managed) |
| `selectedPrinter` | Windows printer name |
| `paperWidth` | `58mm` or `80mm` |
| `autoPrintEnabled` | Automatically print incoming jobs |
| `launchOnStartup` | Start with Windows |

### System Tray

The agent runs in the system tray. Closing the window does not quit the app — it minimizes to tray. Right-click the tray icon for:
- **Show Window** — restore the dashboard
- **Test Print** — print a test ticket
- **Quit** — fully exit the application

Double-clicking the tray icon also restores the window.

### Polling

- Job queue: polled every **3 seconds**
- Heartbeat: sent every **15 seconds**
- Both pause while a job is being printed

### Test Print

Click "Test print" in Settings or the tray menu. Prints a mock ticket with sample order data to verify printer connectivity.

## Key Server Files

| File | Purpose |
|---|---|
| `apps/web/src/lib/printing-store.ts` | Data layer (JSON + MongoDB), station/job CRUD, claim logic |
| `apps/web/src/lib/printing-service.ts` | Business logic, auto-print, retry, lifecycle transitions |
| `apps/web/src/lib/printing-auth.ts` | Station token creation, HMAC hashing, Bearer auth |
| `apps/web/src/lib/printing-types.ts` | `PrintingTenantSnapshot` type |

## Key Agent Files

| File | Purpose |
|---|---|
| `apps/print-agent/src/main/main.ts` | Electron bootstrap, window/tray management |
| `apps/print-agent/src/main/job-runner.ts` | Polling loop, job processing state machine |
| `apps/print-agent/src/main/api-client.ts` | HTTP client for printing API |
| `apps/print-agent/src/main/printer-service.ts` | Windows printer listing, silent printing |
| `apps/print-agent/src/main/ticket-renderer.ts` | HTML ticket template |
| `apps/print-agent/src/main/settings-store.ts` | JSON file persistence |

## Troubleshooting

**Job stuck as "claimed"**
- Wait 5 minutes for claim timeout, then the job becomes reclaimable
- Or cancel the job from the extadmin dashboard and create a reprint

**Agent not receiving jobs**
- Check station is registered and token is valid
- Check `enabled` is true (not deactivated)
- Check auto-print is enabled in agent settings
- Check the server URL is correct

**Printer not printing**
- Verify the printer name matches a Windows printer exactly
- Try "Test print" from settings
- Check the printer is online in Windows Settings > Printers
- For USB printers, try reconnecting the cable

**Agent disappears from taskbar**
- The agent runs in the system tray when the window is closed
- Look for the tray icon in the Windows notification area
- Double-click the tray icon to restore the window
