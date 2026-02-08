# SitSwap - Pet & Home Care Exchange Platform

A TrustedHousesitters-style exchange marketplace connecting homeowners who need pet care and home chores with sitters seeking free accommodation in exchange for help.

## Overview

SitSwap helps homeowners find trusted sitters for pets and home care while they’re away, and helps sitters find great places to stay in exchange for pet care and agreed-upon chores. It includes a swipe-first matching flow, messaging, sit requests, reviews, payments with points, and admin moderation.

## Membership

SitSwap is intended to be membership-based for both homeowners and sitters, with optional add-ons (verification tiers, insurance, and other premium features).

## Features

### For Homeowners
- Create detailed listings with property photos, amenities, and house rules
- Add pets with care instructions, medical conditions, and dietary needs
- Specify house chores (gardening, cleaning, maintenance) needed
- Set available dates for sitting
- Swipe through potential sitters
- Chat with matches in real-time
- Review sitters after stays
- Optional insurance protection

### For Sitters
- Create comprehensive sitter profiles with experience and skills
- Browse listings by location and date
- Swipe through homes with pets and tasks
- Specify pet experience (dogs, cats, birds, etc.)
- List house task skills (gardening, cleaning, handyman)
- Message homeowners after matching
- Build reputation through reviews
- Optional liability protection

### Trust & Safety
- Email and phone verification
- Government ID verification via Stripe Identity
- Three verification tiers (Basic, Enhanced, Premium)
- Public review system with detailed ratings
- Safety report system for concerns
- Admin moderation dashboard
- Secure in-app messaging
- Insurance options available

### Platform Features
- Tinder-style swipe interface
- Real-time messaging with typing indicators
- Advanced search with filters (location, pets, dates, tasks)
- Search/explore automatically hides listings with active confirmed bookings
- Search/explore excludes your own listings (your listings appear only under My Listings)
- Sit management with status tracking
- Sits auto-complete after the end date (no manual completion needed)
- Service + cleaning fee checkout with optional points usage
- Cancellation flow with reasons, refunds, and notifications
- In-app notifications with bell icon (real-time updates in the bell + notification center)
- Branded email alerts for sit requests (including rebook requests), confirmations, cancellations, payments, and completion
- Responsive design (mobile + desktop)
- Mobile app includes Explore, Search, Swipe, Inbox (messages + matches), Sits, Profile, listing detail, and chat
- Admin dashboard for platform management

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Mobile**: React Native (Expo) in `mobile/` (standalone project)
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL 16 (Supabase) with Row Level Security
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (messages, notifications)
- **Payments**: Stripe Embedded Checkout + webhook reconciliation (Connect/Identity ready for expansion)
- **Storage**: Supabase Storage (images and files)
- **Jobs**: Postgres-backed queue + worker (`npm run worker`)
- **Hosting**: Any Next.js-capable platform (Docker, Fly.io, Render, AWS, etc)
- **Styling**: shadcn/ui component library

## Quick Start

### 1. Prerequisites
- Node.js 20.9+ (recommended: `nvm use`)
- Supabase account
- Stripe account

### 2. Installation
```bash
# optional (if you use nvm)
nvm use

npm install
```

### 2b. Mobile App (Separate Project)
The React Native app lives in `mobile/` and is managed independently.

```bash
cd mobile
cp .env.example .env
npm install
npm run ios
```

For Android:

```bash
npm run android
```

### 3. Environment Variables
Copy the template and fill in the required values:

```bash
cp .env.example .env.local
```

Required:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Payment safety: `ALLOW_MANUAL_BOOKING_PAYMENTS=false` (recommended in production)

Important:
- `NEXT_PUBLIC_SUPABASE_URL` must be your Supabase Project URL (example: `https://xxxx.supabase.co`) — not your app URL.
- For production split-deploy, set `NEXT_PUBLIC_ADMIN_APP_URL` (for example `https://admin.example.com`).  
  When set, the main app redirects all `/admin/*` requests to that dedicated admin origin.

### 4. Database Setup
Run the SQL scripts in the `scripts/` folder in filename order in your Supabase SQL Editor (including
`scripts/022_create_storage_bucket.sql` for uploads). For a fresh project, you generally want to run all scripts.

If you see errors like `column listings.listing_type does not exist`, your schema is missing later migrations — run
`scripts/016_add_listing_type_columns.sql` and `scripts/024_backfill_listing_type.sql`.

For production-grade search performance and infrastructure (recommended), also run:
- `scripts/025_add_search_and_geo_infra.sql` (full-text search + indexes + PostGIS helpers)
- `scripts/026_add_cache_rate_limit_and_jobs.sql` (shared cache, rate limiting, background jobs)
- `scripts/027_add_booking_requester.sql` (tracks who initiated a sit request)
- `scripts/028_add_booking_payments_and_points.sql` (service/cleaning fees + points ledger)
- `scripts/029_update_addresses_policy_for_paid_bookings.sql` (addresses visible after payment)
- `scripts/030_prevent_self_booking.sql` (blocks users from booking their own listing)
- `scripts/031_add_booking_overlap_guard.sql` (database-level date overlap + date-range integrity guards)
- `scripts/032_add_stripe_webhook_events.sql` (Stripe webhook idempotency tracking)
- `scripts/033_add_atomic_booking_payment_rpc.sql` (atomic booking payment + points spending lock)
- `scripts/034_harden_internal_rpc_permissions.sql` (restricts internal RPC EXECUTE permissions + payment RPC caller checks)
- `scripts/035_backfill_booking_payment_consistency.sql` (idempotent payment metadata normalization/backfill)
- `scripts/036_add_hot_path_indexes.sql` (webhook/payment/admin hot-path DB indexes)

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### 5. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000`

### 5a. Start Admin App (Split Deploy Target)
Run the dedicated admin app locally:
```bash
PORT=3100 npm run admin:dev
```
Then open `http://localhost:3100/admin`.
For production split deploy, host this app on a separate origin (for example `https://admin.example.com`) and set
`NEXT_PUBLIC_ADMIN_APP_URL` in the main app environment so `/admin/*` traffic is redirected.

### 5b. Run Background Worker (Recommended)
Some work is queued (emails, maintenance cleanup) so requests stay fast and retries are automatic.
Email templates are branded and queued.
The worker reads `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` directly from your env.
To deliver real emails, set SMTP credentials (you can reuse the same SMTP provider configured in Supabase Auth):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`.
In production, keep `ALLOW_EMAIL_LOG_FALLBACK=false` so email jobs fail/retry instead of logging payloads when SMTP is missing.
If you use AWS SES SMTP, note that **sandbox** mode only allows sending to verified recipients. To scale, request SES production
access and verify your sender domain (DKIM). Once out of sandbox, you can email any recipient.

In a second terminal:
```bash
npm run worker
```

### 6. Test a Production Build Locally (Optional)
```bash
npm run build
npm run start
```
Note: `npm run build` requires your Supabase env vars to be set (see `.env.example`).

Build the dedicated admin deployment artifact:
```bash
npm run admin:build
```

### 6b. Map Coordinates (If map shows no markers)
If existing listings were created before geocoding was enabled, run:
```bash
npm run backfill:geocodes
```
This populates missing address latitude/longitude so the map view can render markers.

### 7. End-to-End Testing on Real Devices (Optional)
Use a tunnel (ngrok/Cloudflare Tunnel) and update your Supabase Auth redirect allowlist. See [SETUP.md](./SETUP.md).

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── actions/                  # Server Actions (backend logic)
│   ├── admin/                    # Admin dashboard
│   ├── api/                      # API routes
│   ├── auth/                     # Authentication pages
│   ├── bookings/                 # Sit requests + confirmations (legacy route name; prefer /sits)
│   ├── sits/                     # Sit routes (preferred)
│   ├── dashboard/                # Main explore page
│   ├── listings/                 # Listing CRUD
│   ├── matches/                  # Match view
│   ├── messages/                 # Real-time chat
│   ├── notifications/            # Notification center
│   ├── profile/                  # User profile
│   ├── reviews/                  # Review system
│   ├── search/                   # Advanced search
│   ├── settings/                 # User settings
│   ├── swipe/                    # Tinder-style interface
│   └── users/                    # Public user profiles
├── components/
│   ├── features/                 # Feature-specific components
│   ├── navigation/               # Nav and footer
│   └── ui/                       # shadcn/ui primitives
├── mobile/                       # React Native (Expo) app (standalone)
├── lib/
│   ├── supabase/                 # Database clients
│   ├── types/                    # TypeScript types
│   ├── stripe.ts                 # Stripe config
│   ├── verification.ts           # ID verification
│   ├── connect.ts                # Stripe Connect
│   ├── notifications.tsx         # Email/notification helpers
│   └── utils.ts                  # Utilities
├── scripts/                      # Database migrations (SQL)
└── public/                       # Static assets
```

## Key Features Explained

### Swipe Interface
Located in `app/swipe/page.tsx`. Homeowners see sitter cards, sitters see listing cards. Swipe right to like, left to pass. Mutual likes create a match.

### Real-Time Messaging
Uses Supabase Realtime subscriptions for instant message delivery with typing indicators and read receipts.
Direct listing inquiries are gated to a single intro message until the recipient replies, and the chat surfaces a booking CTA once both parties respond.

### Sit Flow
1. Match created (or direct listing discovery)
2. Sitter requests a sit or homeowner sends a stay invite
3. Other party accepts/declines
4. Sitter completes payment (service fee per night + cleaning fee, with optional points)
5. Address unlocks after payment
6. After dates pass, sits auto-complete, completion emails are sent, and reviews are left
7. Homeowners earn points per completed night; cancellations capture a reason and refund fees + points
8. Cancelled sits show a rebook action so sitters can request again and homeowners can re-invite the same sitter

Detailed sequence diagram: `docs/BOOKING_PAYMENT_LIFECYCLE.md`

### Payments & Points
- Default fees: service fee per night + fixed cleaning fee (values set in `lib/pricing/fees.ts`)
- Points mint to homeowners after completion and never expire
- Points cover service-fee nights; users can mix points + cash
- Cancellations require a reason and trigger refunds for fees + points
- Cash checkout uses Stripe Embedded Checkout; payment finalization occurs via `POST /api/stripe/webhook`
- Points-only bookings can complete directly without cash checkout

### Verification System
- **Basic** (free): Email + phone verification
- **Enhanced** ($29.99): + Government ID via Stripe Identity
- **Premium** ($49.99): + Enhanced ID checks

### Admin Dashboard
Located in `app/admin/`. Admins can:
- View all users and listings
- Manage safety reports
- Moderate flagged reviews
- View platform statistics
- Suspend users if needed

Create your first admin via:
```bash
npm run admin:create -- --email you@example.com --password 'StrongPassword' --role super_admin
```

## Database Schema

19 main tables:
- **profiles** - User accounts
- **addresses** - User addresses
- **listings** - Property listings
- **pets** - Pet information
- **tasks** - House chores/responsibilities
- **availability** - Available date ranges
- **sitter_profiles** - Sitter experience
- **matches** - Swipe matches
- **bookings** - Sit records (requests, confirmations, cancellations)
- **conversations** - Message threads
- **messages** - Chat messages
- **reviews** - Rating system
- **notifications** - In-app alerts
- **safety_reports** - User reports
- **admin_users** - Admin roles
- **points_ledger** - Points earned/spent history
- **cache_entries** - Shared cache
- **rate_limits** - Rate limit counters
- **jobs** - Background job queue

All tables have Row Level Security (RLS) enabled.

## API Routes

- `GET /api/notifications` - Fetch notifications
- `PATCH /api/notifications` - Mark as read
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `GET /api/search` - Search listings
- `POST /api/stripe/webhook` - Stripe payment event reconciliation (server-to-server)
- `POST /api/upload` - Upload images

## Environment Variables

Create `.env.local` (see `.env.example`) and set the same variables in your hosting provider for production.

Required:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Payment safety: `ALLOW_MANUAL_BOOKING_PAYMENTS=false` (recommended in production)
- Worker safety: `SITSWAP_WORKER_ENABLED=true` (recommended in production)

Optional:
- App URL: `NEXT_PUBLIC_APP_URL` (used for email links)
- Storage: `SUPABASE_STORAGE_BUCKET` (defaults to `uploads`)
- Analytics: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- Observability: `NEXT_PUBLIC_SENTRY_DSN` (client) and/or `SENTRY_DSN` (server)
- Jobs/worker: `JOBS_POLL_INTERVAL_MS`, `JOBS_BATCH_SIZE`, `JOBS_LOCK_TIMEOUT_SECONDS`, `JOBS_HOUSEKEEPING_INTERVAL_MS`, `JOBS_WORKER_ID`, `SITSWAP_WORKER_ENABLED`
- Email provider: `RESEND_API_KEY` and/or SMTP settings. `ALLOW_EMAIL_LOG_FALLBACK` controls non-SMTP fallback logging behavior.

Optional (later):
- `CHECKR_API_KEY` - Background checks (TODO)

## Deployment

Deploy to your hosting provider and ensure environment variables are set.

### Manual Deployment
```bash
npm run build
npm run start
```

### Docker Deployment (Recommended for Staging/Prod)
Requires Docker and a populated `.env.local` (or equivalent env vars set in your platform).

```bash
docker build -t sitswap .
docker run --rm -p 3000:3000 --env-file .env.local sitswap
```

### Fly.io (Staging/Prod)
1. Install `flyctl`
2. Run `fly launch` (use the existing `Dockerfile`)
3. Set secrets: `fly secrets set NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...`
4. Deploy: `fly deploy`
5. For split web/admin deployment automation, use `.github/workflows/deploy-fly-split.yml` and follow `docs/FLY_SPLIT_DEPLOY_PIPELINE.md`.

## Security

- JWT authentication via Supabase
- Row Level Security on all tables
- HTTPS enforced
- CSRF protection
- XSS prevention
- Rate limiting on API routes
- Encrypted sensitive data
- Security headers configured
- Self-booking blocked at RLS + app layer

## Testing

### Automated Tests

```bash
# Unit + component tests (Vitest)
npm test

# Script-based tests (fast, no framework)
npm run test:scripts

# Database integration tests (Supabase-backed)
npm run test:scripts:db

# Enforced DB integration gate (fails fast if env missing)
npm run test:scripts:db:required

# Typecheck tests (optional but recommended)
npm run test:typecheck

# Local quality gate (lint + typecheck + unit/script tests + build)
npm run check

# Post-migration smoke checks (staging/prod rollout verification)
npm run smoke:migrations

# Split-deploy verification (web/admin redirect + admin reachability)
SITSWAP_WEB_APP_URL=https://your-web-domain \
SITSWAP_ADMIN_APP_URL=https://your-admin-domain \
npm run verify:split-deploy

# Load-test smoke baseline (health + geocode)
npm run loadtest:smoke

# CI equivalent (adds Playwright E2E)
npm run check:ci

# Coverage
npm run test:coverage

# E2E (Playwright)
npx playwright install chromium
npm run test:e2e:local

# Critical-path auth + booking/payment E2E (fails fast if env missing)
npm run test:e2e:critical
```

Database integration tests (runs against a real Supabase project):
- Local optional run: set `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY`, then run `npm run test:scripts:db`.
- Enforced run (CI/staging): run `npm run test:scripts:db:required` to fail fast when env is missing.

Optional authenticated Playwright tests:
- Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
- Ensure Supabase env vars are configured for browser + fixture seeding:
  - URL: `E2E_SUPABASE_URL` (or `SUPABASE_TEST_URL` / `NEXT_PUBLIC_SUPABASE_URL`)
  - anon key: `E2E_SUPABASE_ANON_KEY` (or `SUPABASE_TEST_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - service role key: `E2E_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_TEST_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`)
- If these are unset, auth E2E tests are skipped.
- Booking payment/cancellation E2E fixtures are auto-seeded by `e2e/global-setup.ts` when auth env vars are set.
- You can override seeded fixture IDs with `E2E_BOOKING_PAYMENT_ID` and `E2E_BOOKING_CANCELLATION_ID`.
- Optional homeowner fixture credentials: `E2E_HOMEOWNER_EMAIL`, `E2E_HOMEOWNER_PASSWORD`.

### Test Accounts
Create 2 test users:
1. Homeowner - create listing with pets
2. Sitter - complete profile with experience
3. Swipe and match
4. Test messaging and sit flow

### Manual Test Checklist
See [SETUP.md](./SETUP.md) for complete testing guide.

## Future Enhancements

- [ ] Checkr background checks
- [ ] Mobile app (React Native)
- [ ] Video chat for initial meetings
- [ ] Calendar sync
- [ ] Smart home integration
- [ ] International expansion
- [ ] Corporate housing programs
- [ ] B2B property management partnerships

## Operations Docs

- `docs/BOOKING_PAYMENT_LIFECYCLE.md`
- `docs/DEEP_CODE_REVIEW.md`
- `docs/MIGRATION_RUNBOOK.md`
- `docs/STAGING_PARITY_CHECKLIST.md`
- `docs/OBSERVABILITY_ALERTS.md`
- `docs/DASHBOARD_METRICS.md`
- `docs/PERFORMANCE_PLAYBOOK.md`
- `docs/runbooks/payments-outage.md`
- `docs/runbooks/auth-outage.md`
- `docs/EMAIL_DELIVERY_OPERATIONS.md`
- `docs/LEGAL_AND_COMPLIANCE_CHECKLIST.md`
- `docs/RELEASE_TRAIN.md`
- `docs/SUPPORT_WORKFLOWS.md`

## License

Copyright © 2025 SitSwap. All rights reserved.

## Support

For setup help, see [SETUP.md](./SETUP.md) or create an issue.

---

Built with Next.js, Supabase, and Stripe.
