# Production Launch Checklist

> **DO NOT deploy until every item in this checklist is verified.**
>
> Hard rules:
> - No demo credentials in production
> - No fallback secrets in production
> - No mock payment mode in production
> - Checkout, payment, and printing must be tested end-to-end first

---

## 1. Current Deployment Setup

### What exists today

| Component | Status |
|---|---|
| Next.js 15 app | Monorepo workspace (`apps/web`), runs via `next dev` |
| Database | MongoDB supported but optional. JSON files in `apps/web/data/` are the default fallback |
| File uploads | Local disk only (`public/uploads/`) |
| Payments | Stripe SDK integrated. Returns mock IDs when `STRIPE_SECRET_KEY` is unset |
| Email | SendGrid integrated. Silently fails when `SENDGRID_API_KEY` is unset |
| Auth | 5 separate HMAC-signed cookie systems (platform, extadmin, customer, driver, printing). Each has hardcoded dev fallback secrets |
| Multi-tenancy | Subdomain + custom domain resolution via `tenant-resolver.ts`. Platform hosts configured via `TENANT_PLATFORM_HOSTS` |
| Print agent | Electron app in `apps/print-agent`. NSIS Windows installer config exists. Polls server every 3s |
| Docker | None |
| CI/CD | None |
| Monitoring | None |
| Backups | None |

### Blocking issues for production

1. **`customer-auth.ts`** — no production guard. Falls back to `"bella-roma-customer-dev-secret"` silently
2. **`driver-auth.ts`** — no production guard. Falls back to `"bella-roma-driver-dev-secret"` silently
3. **`printing-auth.ts`** — falls back to `"printing-dev-pepper"` silently
4. **`payments.ts`** — returns mock payment intents when `STRIPE_SECRET_KEY` is empty
5. **`uploads.ts`** — writes to ephemeral filesystem. Will not survive container restarts or scale horizontally
6. **No health endpoint** — no way to monitor if the app is alive
7. **No structured logging** — console.log/console.warn only

---

## 2. Deployment Recommendation

### Recommended: Vercel + MongoDB Atlas + Cloudflare R2

```
[ Users ]
   |
   v
[ Cloudflare DNS ] --> [ Vercel (Next.js) ]
                            |
                    +-------+-------+
                    |               |
              [ MongoDB Atlas ]  [ Cloudflare R2 ]
              (database)         (file uploads)
                    |
              [ SendGrid ]
              (email)
```

### Why this stack

| Concern | Choice | Reason |
|---|---|---|
| Hosting | **Vercel** | Native Next.js support. Zero config deploys. Automatic HTTPS. Edge middleware for tenant routing. Generous free tier for launch |
| Database | **MongoDB Atlas M0** (free) → M2 when needed | Already fully wired in the codebase with indexes. Free tier handles ~500 connections. No code changes needed |
| File storage | **Cloudflare R2** | S3-compatible API. Zero egress fees. Critical for a restaurant SaaS that serves images on every page load |
| CDN | Vercel built-in | Assets and static pages cached at edge automatically |
| DNS | Cloudflare | DNS + proxy + free SSL. Wildcard subdomain support for multi-tenant |
| Email | SendGrid | Already integrated. Free tier = 100 emails/day |

### Alternative options

| Option | Pros | Cons | Best for |
|---|---|---|---|
| **VPS (Hetzner/DigitalOcean) + Docker** | Full control, cheaper at scale, persistent filesystem | You manage SSL, backups, updates, monitoring yourself | When you have 10+ tenants and need cost control |
| **Railway** | Easy Docker deploys, persistent volumes, built-in MongoDB | More expensive per compute unit, smaller ecosystem | Quick staging environment |
| **Render** | Similar to Railway, good free tier | Cold starts on free tier, slower builds | Prototyping |

### Decision: start with Vercel + Atlas + R2

- Zero infrastructure management at launch
- Scale to M2/M5 Atlas and Vercel Pro when you have paying tenants
- Migrate to VPS later if costs justify it

---

## 3. Environment Variable Checklist

### Generate all secrets first

Run this to generate unique hex secrets:

```bash
node -e "const c=require('crypto'); ['AUTH_SECRET','PLATFORM_AUTH_SECRET','EXTADMIN_AUTH_SECRET','CUSTOMER_AUTH_SECRET','DRIVER_AUTH_SECRET','PRINTING_TOKEN_PEPPER'].forEach(n => console.log(n + '=' + c.randomBytes(32).toString('hex')))"
```

### Required variables

#### Application

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Must be `production`. Enables secure cookies, disables mock payments, enforces webhook signatures |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Used for canonical URLs, Stripe redirects |
| `PERSISTENCE_MODE` | `json` | Keep `json` for now. All stores use MongoDB when `MONGODB_URI` is set, regardless of this value |

#### Database

| Variable | Example | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net` | Atlas connection string. Get from Atlas dashboard → Connect → Drivers |
| `MONGODB_DB` | `rcc_production` | Database name. Use a separate DB per environment (staging vs production) |

#### Auth secrets (generate unique 64-char hex for each)

| Variable | Where used | Production guard exists? |
|---|---|---|
| `AUTH_SECRET` | Fallback for all auth systems | No — only used if specific secret is missing |
| `PLATFORM_AUTH_SECRET` | Platform super admin sessions (`platform-auth.ts`) | Yes — throws in production if missing |
| `EXTADMIN_AUTH_SECRET` | Restaurant owner/staff sessions (`extadmin-auth.ts`) | Yes — throws in production if missing |
| `CUSTOMER_AUTH_SECRET` | Customer sessions (`customer-auth.ts`) | **No — silently falls back to dev secret. Must fix before deploy** |
| `DRIVER_AUTH_SECRET` | Driver sessions (`driver-auth.ts`) | **No — silently falls back to dev secret. Must fix before deploy** |
| `PRINTING_TOKEN_PEPPER` | Print station token hashing (`printing-auth.ts`) | **No — silently falls back to dev pepper. Must fix before deploy** |

#### Super admin credentials

| Variable | Example | Notes |
|---|---|---|
| `PLATFORM_ADMIN_EMAIL` | `admin@yourdomain.com` | Platform super admin login. Use a real, secure email |
| `PLATFORM_ADMIN_PASSWORD` | (strong password) | Minimum 16 characters. Store in password manager. Not in git |

#### Stripe

| Variable | Source | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key | Starts with `sk_live_` for production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys → Publishable key | Starts with `pk_live_` for production |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret | Starts with `whsec_`. Only available after creating the webhook endpoint |

#### Email

| Variable | Example | Notes |
|---|---|---|
| `SENDGRID_API_KEY` | `SG.xxxxx.yyyyy` | SendGrid → Settings → API Keys → Create. Give "Mail Send" permission only |
| `SENDGRID_FROM_EMAIL` | `orders@yourdomain.com` | Must be a verified sender in SendGrid. Verify via DNS or email confirmation |
| `SENDGRID_FROM_NAME` | `Your Restaurant Orders` | Display name for outgoing emails |

#### Multi-tenant DNS

| Variable | Example | Notes |
|---|---|---|
| `TENANT_PLATFORM_HOSTS` | `admin.yourdomain.com,yourdomain.com` | Comma-separated. These hostnames serve the platform admin. All others resolve to tenant storefronts |
| `TENANT_CUSTOM_DOMAIN_MAP` | *(optional)* | Custom domain to tenant mapping if needed |

#### File storage

| Variable | Example | Notes |
|---|---|---|
| `UPLOAD_PROVIDER` | `local` or `s3` | `local` writes to disk (works on VPS, not Vercel). `s3` uses R2 |
| `AWS_S3_BUCKET` | `rcc-uploads-production` | R2 bucket name |
| `AWS_S3_REGION` | `auto` | Use `auto` for Cloudflare R2 |
| `AWS_S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | R2 S3 API endpoint |
| `AWS_ACCESS_KEY_ID` | *(from R2 dashboard)* | R2 → Manage R2 API Tokens → Create API Token |
| `AWS_SECRET_ACCESS_KEY` | *(from R2 dashboard)* | Shown once when creating the token |

#### Printing

| Variable | Example | Notes |
|---|---|---|
| `PRINTING_REGISTRATION_KEY` | (generate a strong key) | Required for print stations to register. Share with restaurant staff to connect their printer |

#### Optional (recommended for production)

| Variable | Example | Notes |
|---|---|---|
| `MONGODB_POOL_SIZE` | `10` | Connection pool size. Default is 10 |
| `SENDGRID_FROM_NAME` | `Restaurant Orders` | Email display name |

---

## 4. Pre-Deployment Code Fixes Required

These must be completed before any production deploy. The app will run insecurely without them.

### 4.1 Fix customer-auth.ts — add production guard

File: `apps/web/src/lib/customer-auth.ts` line 16-20

Current code falls back silently:
```ts
function getAuthSecret() {
  return (
    process.env.CUSTOMER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "bella-roma-customer-dev-secret"
  );
}
```

Must be changed to throw in production like `extadmin-auth.ts` does.

### 4.2 Fix driver-auth.ts — add production guard

File: `apps/web/src/lib/driver-auth.ts` line 17

Same issue — falls back to `"bella-roma-driver-dev-secret"` silently.

### 4.3 Fix printing-auth.ts — add production guard

File: `apps/web/src/lib/printing-auth.ts` line 10-16

Falls back to `"printing-dev-pepper"` silently. If a print station was registered with the dev pepper, changing the pepper invalidates all existing station tokens.

### 4.4 Remove mock payment fallback

File: `apps/web/src/lib/payments.ts`

When `STRIPE_SECRET_KEY` is not set, `getStripeClient()` returns `null` and `createPaymentIntent` returns mock data (`pi_mock_secret_*`). In production with `NODE_ENV=production`, this should throw an error instead of silently mocking.

### 4.5 Verify next.config.ts for production

File: `apps/web/next.config.ts`

If deploying to Vercel, no changes needed. If deploying via Docker, add `output: "standalone"`.

---

## 5. Deployment Checklist

### Phase A — Pre-deploy validation

- [ ] **Typecheck passes**: `npm run typecheck` — zero errors
- [ ] **Tests pass**: `npm run test` — all tests green
- [ ] **Build succeeds**: `npm run build` — no build errors
- [ ] **No hardcoded secrets**: grep for `bella-roma`, `dev-secret`, `demo1234`, `test12345` in `src/` — should only appear in fallback warnings or mock data defaults, never in auth paths
- [ ] **Production guards in place**: all 5 auth modules throw when secrets are missing in production

### Phase B — Infrastructure setup

- [ ] **MongoDB Atlas**: Create cluster → Create database user → Whitelist `0.0.0.0/0` (Vercel IPs are dynamic) → Get connection string
- [ ] **Cloudflare R2** (if using S3 uploads): Create bucket → Create API token → Note endpoint, access key, secret key
- [ ] **Vercel project**: Import repo → Set root directory to `apps/web` → Configure framework preset as Next.js
- [ ] **SendGrid**: Create account → Verify sender domain → Create API key with "Mail Send" permission
- [ ] **Stripe**: Switch from test to live mode → Note live API keys

### Phase C — Environment configuration

- [ ] **Set ALL environment variables** in Vercel dashboard (Settings → Environment Variables)
- [ ] **NODE_ENV = production** — this is critical for secure cookies, webhook enforcement, and auth guards
- [ ] **Generate unique secrets** for each auth system using the command in Section 3
- [ ] **Set strong PLATFORM_ADMIN_PASSWORD** — 16+ chars, stored in password manager
- [ ] **Set PRINTING_REGISTRATION_KEY** — generate a random key to control print station access
- [ ] **UPLOAD_PROVIDER = s3** if using R2, or `local` if using VPS
- [ ] **Verify no `.env.local` file** is committed to git

### Phase D — Domain and DNS

- [ ] **Point domain to Vercel**: Add `yourdomain.com` in Vercel → Project Settings → Domains. Follow Vercel's DNS instructions
- [ ] **Configure subdomain wildcard**: In Cloudflare DNS, add `*` CNAME record pointing to `cname.vercel-dns.com`
- [ ] **Set TENANT_PLATFORM_HOSTS**: `admin.yourdomain.com,yourdomain.com`
- [ ] **Verify SSL**: Vercel provisions SSL automatically. Confirm HTTPS works on both root and wildcard
- [ ] **Test tenant resolution**: Visit `tenant-slug.yourdomain.com` — should resolve to the correct tenant storefront

### Phase E — Stripe webhook

- [ ] **Create webhook endpoint** in Stripe Dashboard → Developers → Webhooks → Add endpoint
  - URL: `https://yourdomain.com/api/v1/webhooks/stripe`
  - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] **Copy webhook signing secret** (`whsec_*`) → set as `STRIPE_WEBHOOK_SECRET`
- [ ] **Test with Stripe CLI**: `stripe listen --forward-to https://yourdomain.com/api/v1/webhooks/stripe`
- [ ] **Verify in Stripe Dashboard**: Webhook logs should show 200 responses

### Phase F — First deploy

- [ ] **Deploy to Vercel**: `git push` to main branch (or use Vercel CLI: `vercel --prod`)
- [ ] **Check build logs**: No warnings about missing env vars
- [ ] **Visit the deployed URL**: Homepage loads, menu loads, images display

### Phase G — Smoke test the critical path

- [ ] **Platform admin login**: Go to `admin.yourdomain.com/platform/login` — login with PLATFORM_ADMIN credentials
- [ ] **Create tenant**: Use platform admin to create a restaurant tenant
- [ ] **Restaurant owner login**: Go to `tenant-slug.yourdomain.com/extadmin/login` — login with owner credentials
- [ ] **Configure menu**: Add at least one category and one menu item
- [ ] **Place a test order**:
  1. Visit `tenant-slug.yourdomain.com/menu`
  2. Add item to cart
  3. Go to `/cart` → choose delivery or collection
  4. Complete checkout with card payment (Stripe live mode with a real card, or use Stripe test cards if in test mode)
  5. Verify order appears in extadmin orders dashboard
  6. Verify Stripe payment shows as "succeeded" in Stripe Dashboard
  7. Verify email was received (check SendGrid activity feed)
- [ ] **Test cash order**: Place order with cash → verify it shows as "placed" immediately
- [ ] **Test webhook**: Verify Stripe webhook logs show 200 for the payment events

### Phase H — Print agent

- [ ] **Build installer**: `npm run package:print-agent` from repo root
- [ ] **Locate installer**: `apps/print-agent/release/` — find the `.exe` installer
- [ ] **Install on Windows machine** connected to a thermal printer
- [ ] **Configure agent**:
  1. Server URL: `https://yourdomain.com`
  2. Tenant ID: (from platform admin tenant list)
  3. Registration Key: (value of `PRINTING_REGISTRATION_KEY`)
  4. Select printer
  5. Enable auto-print
- [ ] **Register station**: Click connect → verify station appears in extadmin
- [ ] **Test print flow**:
  1. Place an order (cash or paid card)
  2. Verify print job appears in agent queue within 3 seconds
  3. Verify ticket prints with correct items, prices, and order number
  4. Test reprint from extadmin orders page
- [ ] **Test failure recovery**: Disconnect printer → place order → reconnect → verify retry

---

## 6. Monitoring Checklist

### Immediate (set up before launch)

#### Failed orders
- [ ] Monitor operations store for orders stuck in `pending_payment` for > 10 minutes
- [ ] Alert on orders where `paymentStatus = "failed"` but `orderStatus` is not `cancelled`
- [ ] Check: after placing an order with card payment, does the order move to `placed` within 30 seconds?

#### Failed payments
- [ ] Monitor Stripe Dashboard → Payments → check for declined payments
- [ ] Monitor `/api/v1/webhooks/stripe` response codes in Vercel logs — should always be 200
- [ ] Monitor `payments-content` for records where `status = "pending"` for > 5 minutes
- [ ] Alert on `STRIPE_SECRET_KEY` being empty (the app should refuse to start in production)

#### Failed print jobs
- [ ] Monitor `printing_jobs` for jobs stuck in `pending` or `printing` for > 5 minutes
- [ ] Monitor `printing_jobs` where `status = "failed"` — check `lastError` field
- [ ] Alert on consecutive print failures from the same station (> 3 in a row)

#### Disconnected printers
- [ ] Monitor `printing_stations` for stations with no heartbeat for > 2 minutes
- [ ] Show disconnected status in extadmin dashboard (if not already visible)
- [ ] Alert restaurant owner via email if all their stations go offline

#### Server errors
- [ ] Enable Vercel Analytics and Speed Insights (Project Settings → Analytics)
- [ ] Monitor Vercel deployment logs for 500 errors
- [ ] Add a `GET /api/health` endpoint that checks:
  - MongoDB connectivity
  - Stripe key presence (env var check, not API call)
  - Returns `{ status: "ok" }` or `{ status: "degraded", checks: [...] }`
- [ ] Set up Vercel monitoring alerts (available on Pro plan) or use an external uptime monitor (e.g., UptimeRobot free tier) pointing to `/api/health`

#### Suspicious login attempts
- [ ] Monitor `audit_log` for rapid failed login attempts (> 5 in 5 minutes from same IP)
- [ ] Monitor `extadmin_users` for password changes
- [ ] Monitor new station registrations — each registration should correspond to a known device
- [ ] Monitor login from new/unusual locations

### Recommended (add in first month)

| Area | Tool | Why |
|---|---|---|
| Error tracking | Sentry (`@sentry/nextjs`) | Captures unhandled exceptions with stack traces. Free tier = 5k events/month |
| Uptime monitoring | UptimeRobot (free) | Pings `/api/health` every 5 minutes. Alerts via email/Slack on downtime |
| Log aggregation | Vercel logs (built-in) + Axiom (Vercel integration) | Structured query over request logs. Free tier available |
| Performance | Vercel Speed Insights | Real user monitoring for page load times |
| Stripe monitoring | Stripe Dashboard + Stripe Sigma | Revenue analytics, failed payment rates, dispute tracking |

---

## 7. Post-Launch Verification

After everything is live, verify these from an external device (phone, different network):

- [ ] Homepage loads on mobile
- [ ] Menu items display with images
- [ ] Add to cart works
- [ ] Checkout completes with a real card
- [ ] Order confirmation email arrives
- [ ] Order appears in restaurant owner dashboard
- [ ] Print ticket prints on thermal printer
- [ ] Delivery tracking page updates in real-time
- [ ] Customer account creation and login works
- [ ] Password reset works (if implemented)
- [ ] Contact form sends email
- [ ] Booking request sends email
- [ ] Gallery and reviews pages load
- [ ] Platform admin can create/edit tenants
- [ ] Custom domain resolves to correct tenant

---

## Quick Reference — One-page Deploy Command Sequence

```bash
# 1. Validate locally
npm run typecheck
npm run test
npm run build

# 2. Deploy (Vercel auto-deploys on push, or use CLI)
vercel --prod

# 3. Verify health
curl https://yourdomain.com/api/health

# 4. Build print agent installer
npm run package:print-agent

# 5. Generate secrets for a new environment
node -e "const c=require('crypto'); ['AUTH_SECRET','PLATFORM_AUTH_SECRET','EXTADMIN_AUTH_SECRET','CUSTOMER_AUTH_SECRET','DRIVER_AUTH_SECRET','PRINTING_TOKEN_PEPPER','PRINTING_REGISTRATION_KEY'].forEach(n => console.log(n + '=' + c.randomBytes(32).toString('hex')))"
```
