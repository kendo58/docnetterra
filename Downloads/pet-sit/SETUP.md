# SitSwap Platform - Complete Setup Guide

This guide will walk you through setting up the SitSwap platform from scratch with the professional admin management system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Application](#running-the-application)
5. [Admin Setup (New Professional Method)](#admin-setup)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- Node.js 20.9 or higher installed (recommended: `nvm use`)
- A Supabase account (free tier works)
- A Stripe account (test mode is fine for development)
- Git installed

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details (name, database password, region)
4. Wait for the project to be provisioned (~2 minutes)

### Step 2: Run Database Migrations

The database setup is done through SQL scripts located in the `scripts/` folder. You need to run them **in order**:

#### Using Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, go to SQL Editor
2. Create a new query
3. Copy and paste each script **in order**:

   **Script 1: Core Schema** (`001_create_core_schema.sql`)
   - Creates profiles, addresses, identity verifications
   - Sets up authentication triggers
   - Run this first

   **Script 2: Listings and Pets** (`002_create_listings_and_pets.sql`)
   - Creates listings, pets, tasks, availability tables
   - Sets up RLS policies for listings
   - Run second

   **Script 3: Sitter Profiles** (`003_create_sitter_profiles.sql`)
   - Creates sitter profiles and references tables
   - Sets up sitter-specific RLS policies
   - Run third

   **Script 4: Matching System** (`004_create_matching_system.sql`)
   - Creates matches and bookings (sit records) tables
   - Sets up matching algorithm support
   - Run fourth

   **Script 5: Messaging and Reviews** (`005_create_messaging_and_reviews.sql`)
   - Creates conversations, messages, reviews, notifications, and safety reports
   - Sets up real-time subscriptions
   - Run fifth

   **Script 6: Admin Tables** (`006_create_admin_tables.sql`)
   - Creates admin users and safety reports tables
   - Sets up admin-specific policies
   - Run sixth

   **Script 7: Migration - Add is_admin Column** (`007_add_is_admin_column.sql`)
   - **ONLY RUN THIS IF**: You already ran script 001 before the `is_admin` column was added
   - Adds the `is_admin` column to existing profiles tables
   - Safe to run multiple times (idempotent)
   - Skip if you're setting up fresh or already have the column

   **Storage: Uploads Bucket** (`022_create_storage_bucket.sql`)
   - Creates the `uploads` storage bucket and RLS policies for file uploads
   - Run this to enable image uploads

   **Script 23: Admin RLS Hardening** (`023_harden_admin_rls.sql`)
   - Tightens admin/safety report RLS policies (recommended for production)

   **Remaining Migrations** (`008_...` through `036_...`)
   - Run any remaining scripts in the `scripts/` folder in filename order to bring your schema fully up to date.

   Recommended for production:
   - `025_add_search_and_geo_infra.sql` (full-text search + indexes + PostGIS helpers)
   - `026_add_cache_rate_limit_and_jobs.sql` (shared cache, rate limiting, background jobs)
   - `027_add_booking_requester.sql` (tracks sit request initiator)
   - `028_add_booking_payments_and_points.sql` (fee + points ledger support)
   - `029_update_addresses_policy_for_paid_bookings.sql` (address unlock after payment)
   - `030_prevent_self_booking.sql` (prevents booking your own listing)
   - `031_add_booking_overlap_guard.sql` (DB-level overlap + date-range booking protection)
   - `032_add_stripe_webhook_events.sql` (Stripe webhook idempotency table)
   - `033_add_atomic_booking_payment_rpc.sql` (atomic payment + points debit with per-user lock)
   - `034_harden_internal_rpc_permissions.sql` (restrict internal RPC access to service role + RPC caller checks)
   - `035_backfill_booking_payment_consistency.sql` (idempotent payment metadata normalization/backfill)
   - `036_add_hot_path_indexes.sql` (hot-path indexes for webhook/payment/admin queries)

4. Click "Run" for each script
5. Verify no errors in the output

### Step 3: Verify Database Setup

In the Supabase dashboard:
1. Go to "Table Editor"
2. You should see 15+ tables including:
   - profiles
   - listings
   - pets
   - matches
   - bookings (sit records)
   - messages
   - reviews
   - notifications
   - admin_users

## Environment Configuration

Create a local `.env.local` for development and set the same variables in your hosting provider for production.
Start by copying the template:

```bash
cp .env.example .env.local
```

Next.js loads `.env.local` automatically for `npm run dev`, `npm run build`, and `npm run start`. Restart your dev server
after changing env vars.

### App
- `NEXT_PUBLIC_APP_URL` - Base URL for SEO/metadata (local: `http://localhost:3000`, production: `https://your-domain.com`)

### Supabase (required)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase Project URL (example: `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only key used for admin/server actions (**never** expose this to the browser)

Optional aliases (server-side tooling):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Supabase Auth URLs (important)
If you use email verification / magic links / OAuth, configure allowed redirects in Supabase:

1. Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your app URL for the current environment (local/tunnel/prod).
3. Add **Redirect URLs** that match what the app uses (at minimum: `http://localhost:3000/dashboard`).

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` must always point to Supabase. If you accidentally set it to your app URL, login will fail
  with `Unexpected token '<' ... is not valid JSON` because Supabase requests hit your Next.js app instead of Supabase.

### Stripe (required for payments)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `ALLOW_MANUAL_BOOKING_PAYMENTS` - keep `false` in production (prevents manual/test booking payment completion)

### Storage (Supabase Storage)
- `SUPABASE_STORAGE_BUCKET` - Bucket name for uploads (defaults to `uploads`)

After running the core database scripts, run `scripts/022_create_storage_bucket.sql` to create the `uploads` bucket and
required RLS policies for file uploads.

### Analytics (optional)
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host (defaults to `https://app.posthog.com`)

### Admin
- Admin access always requires authentication + admin role membership.
- Use `/admin/setup` (local only) or `npm run admin:create` to bootstrap admin access.
- `NEXT_PUBLIC_ADMIN_APP_URL` (recommended in production): dedicated admin origin (for example `https://admin.example.com`).
  When set, the main app redirects `/admin/*` traffic to that external admin app.
- `ADMIN_APP_URL` (optional server-only override): if set, proxy redirect will prefer this value over `NEXT_PUBLIC_ADMIN_APP_URL`.

### Dev helpers (optional)
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` - Overrides the email verification redirect target during signup
  (example: `http://localhost:3000/dashboard`)

### Optional (for later)
- `RESEND_API_KEY` - For email sending (currently logs to console)
- `CHECKR_API_KEY` - For background checks (to be added later)

## Running the Application

### Fastest Iteration (Development)

```bash
# optional (if you use nvm)
nvm use
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

### Dedicated Admin App (Split Deploy)

Run the dedicated admin app locally on a different port:

```bash
PORT=3100 npm run admin:dev
```

The admin portal will be available at `http://localhost:3100/admin`.

### Background Worker (Recommended)
Some work is queued (emails, maintenance cleanup) so requests stay fast and retries are automatic.

Run the worker in a second terminal:

```bash
npm run worker
```

### Production-Like Local Test
This is the closest to how your hosting provider will run the app.

```bash
# optional (if you use nvm)
nvm use
npm run build
npm run start
```

Build the dedicated admin deployment artifact:

```bash
npm run admin:build
```

### End-to-End Testing on Real Devices (Tunnel)
If you want to test the full flow on a phone or share a link without deploying:

1. Start the app: `npm run dev`
2. Start a tunnel (example): `npx ngrok http 3000`
3. Update `.env.local`:
   - Set `NEXT_PUBLIC_APP_URL` to the tunnel URL (example: `https://xxxx.ngrok-free.app`)
   - Optionally set `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` to `https://xxxx.ngrok-free.app/dashboard`
4. Supabase Dashboard → Authentication → URL Configuration:
   - Add the tunnel URL (example: `https://xxxx.ngrok-free.app/dashboard`) to **Redirect URLs**
5. Restart `npm run dev`

Notes:
- Tunnel URLs change often; for stable testing, use a reserved domain or a staging deploy.
- Do **not** change `NEXT_PUBLIC_SUPABASE_URL` for tunnels — it stays your Supabase Project URL.

### First User Setup

1. Navigate to `http://localhost:3000`
2. Click "Get Started" or "Sign Up"
3. Create an account with email and password
4. You'll be redirected to the dashboard
5. Complete your profile in `/profile/edit`

### Creating Test Data

To test the platform, you'll need at least 2 users:

**User 1 - Homeowner:**
1. Create account
2. Go to "Create Listing"
3. Add property details, pets, and responsibilities
4. Set availability dates

**User 2 - Sitter:**
1. Create second account (use incognito/different browser)
2. Complete sitter profile (`/profile/edit`)
3. Add pet experience and skills
4. Go to "Swipe" to find the listing
5. Swipe right to like

When both users like each other, a match is created!

## Admin Setup

### Create First Admin (Recommended for Staging/Production)

Create admins via the CLI so the bootstrap flow isn’t exposed as a public web endpoint:

```bash
npm run admin:create -- --email you@example.com --password 'StrongPassword' --role super_admin
```

Then:

1. Go to `/admin/login`
2. Sign in with your admin credentials
3. You now have access to the admin portal

### Local Dev Convenience (Optional)

The `/admin/setup` UI is available in local development to help verify your database/scripts, but it is **disabled in production**.

### Managing Additional Admins

Once you're logged in as an admin:

1. Go to `/admin/admins`
2. Click "Grant Admin Access"
3. Enter the email of an existing user
4. Select their role:
   - **Moderator** - Limited permissions (reviews, reports)
   - **Admin** - Full user and listing management
   - **Super Admin** - All permissions including managing other admins
5. Click "Grant Access"

The user will immediately have admin access and can log in at `/admin/login`.

#### Admin Roles Explained

**Super Admin:**
- All permissions
- Can manage other admins
- Can grant/revoke admin access
- Full platform control

**Admin:**
- Manage users (verify, suspend)
- Manage listings (approve, remove)
- Handle safety reports
- Moderate reviews
- View analytics

**Moderator:**
- Handle safety reports
- Moderate flagged reviews
- View user information
- Cannot manage users or admins

### Development Note (Admin Security)

Admin auth bypass is intentionally disabled. Even in local development, `/admin` requires a signed-in admin user.

If you need access in local dev:
1. Run `npm run admin:create -- --email you@example.com --password 'StrongPassword' --role super_admin`
2. Sign in via `/admin/login`

### Legacy Manual Method (Not Recommended)

If you prefer the old manual SQL approach:

```sql
-- First, create a regular user account through the UI
-- Then run this query with your user's email:

-- Find your user ID
SELECT id FROM profiles WHERE email = 'your-email@example.com';

-- Grant admin access (replace YOUR_USER_ID)
INSERT INTO admin_users (id, role, permissions)
VALUES ('YOUR_USER_ID', 'super_admin', '{
  "manage_users": true,
  "manage_listings": true,
  "manage_reports": true,
  "manage_admins": true,
  "view_analytics": true
}'::jsonb);

UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
```

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

Database integration tests:
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

### Manual Testing Checklist

- [ ] User signup and login
- [ ] Profile editing and photo upload
- [ ] Creating a listing with pets and tasks
- [ ] Image uploads for listings and pets
- [ ] Sitter profile creation
- [ ] Swipe interface works
- [ ] Matching creates a match
- [ ] Real-time messaging
- [ ] Sit request creation
- [ ] Sit acceptance/decline
- [ ] Review submission
- [ ] Notification bell shows notifications
- [ ] Search with filters
- [ ] Settings page
- [ ] Admin login (`/admin/login`)
- [ ] Admin dashboard features
- [ ] Admin user management

### Test User Flow

**Complete Flow Test:**
1. User A creates listing with pet
2. User B creates sitter profile
3. User B swipes and likes User A's listing
4. User A swipes and likes User B
5. Match notification appears
6. Send messages back and forth
7. User B requests a sit
8. User A accepts the sit request
9. After dates pass, both leave reviews

**Admin Flow Test:**
1. Create first admin via `npm run admin:create`
2. Log in to admin portal
3. View dashboard statistics
4. Browse users in `/admin/users`
5. Create second admin via `/admin/admins`
6. Test revoking admin access
7. Handle a test safety report

## Deployment

Deploy the Next.js app to your hosting provider (Docker, Fly.io, Render, AWS, etc). Ensure environment variables are set
and database scripts have been applied in the target Supabase project.

### Manual Deployment

```bash
# Build the application
npm run build

# Test production build locally
npm run start
```

### Map Coordinates (If map shows no markers)
If existing listings were created before geocoding was enabled, run:
```bash
npm run backfill:geocodes
```
This populates missing address latitude/longitude so the map view can render markers.

### Docker Deployment (Recommended for Staging/Prod)

```bash
docker build -t sitswap .
docker run --rm -p 3000:3000 --env-file .env.local sitswap
```

### Fly.io (Staging/Prod)

```bash
# one-time: install flyctl, then
fly launch
fly secrets set NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
fly secrets set STRIPE_SECRET_KEY=... NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
fly deploy
```

### Fly Split Deploy (Web + Admin, Recommended)

- Use the dedicated workflow: `.github/workflows/deploy-fly-split.yml`
- Configure GitHub environments (`staging`, `production`) with:
  - vars: `FLY_WEB_APP`, `FLY_ADMIN_APP`, `WEB_APP_URL`, `ADMIN_APP_URL`
  - secrets: `FLY_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Full setup guide: `docs/FLY_SPLIT_DEPLOY_PIPELINE.md`

Manual verification command:

```bash
SITSWAP_WEB_APP_URL=https://your-web-domain \
SITSWAP_ADMIN_APP_URL=https://your-admin-domain \
npm run verify:split-deploy
```

### Post-Deployment Checklist

- [ ] Database scripts executed in production
- [ ] All environment variables set in your hosting provider
- [ ] Dedicated admin app deployed and `NEXT_PUBLIC_ADMIN_APP_URL` configured
- [ ] Create first admin via `npm run admin:create`
- [ ] Test signup flow
- [ ] Test image uploads
- [ ] Test Stripe integration
- [ ] Test admin access
- [ ] Monitor logs for errors
- [ ] Set up monitoring and alerts

## Troubleshooting

### Common Issues

**Issue: `Unexpected token '<' ... is not valid JSON` when logging in**
- **Cause**: `NEXT_PUBLIC_SUPABASE_URL` is set to your app URL (localhost/tunnel) instead of your Supabase Project URL
- **Solution**: Set `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co` and restart `npm run dev`

**Issue: `@supabase/ssr: Your project's URL and API key are required...` (or build fails on `/auth/login`)**
- **Cause**: Missing/empty `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Solution**: Fill in `.env.local` (copy from `.env.example`) and rerun `npm run build`

**Issue: Node.js version error (requires Node 20.9+)**
- **Cause**: Using Node 18 or older
- **Solution**: Install/use Node 20.9+ (recommended: `nvm use`)

**Issue: Environment variables not loading**
- **Cause**: The file is not named `.env.local` or is not in the project root (typos like `.env.loval` won’t be loaded)
- **Solution**: Copy `.env.example` → `.env.local`, fill values, and restart `npm run dev`

**Issue: "Failed to fetch" error on login**
- **Cause**: Database tables not created yet
- **Solution**: Run all database scripts in order

**Issue: Can't access `/admin/setup`**
- **Cause**: `/admin/setup` is disabled in production
- **Solution**: Use `npm run admin:create` to create the first admin, then sign in via `/admin/login`

**Issue: "An admin account already exists" error**
- **Cause**: Setup already completed
- **Solution**: Use `/admin/login` to sign in, or manage admins via `/admin/admins`

**Issue: "Invalid UUID" error on /listings/new**
- **Cause**: Route conflict with dynamic route
- **Solution**: Already fixed in code, refresh page

**Issue: Images not uploading**
- **Cause**: Missing `uploads` bucket or Storage RLS policies
- **Solution**: Run `scripts/022_create_storage_bucket.sql` and ensure `SUPABASE_STORAGE_BUCKET` matches your bucket name

**Issue: Stripe payments failing**
- **Cause**: Test mode keys or invalid configuration
- **Solution**: Use Stripe test card: 4242 4242 4242 4242

**Issue: Real-time messages not working**
- **Cause**: Supabase Realtime not enabled
- **Solution**: Enable Realtime in Supabase dashboard → Database → Replication

**Issue: Notifications not appearing**
- **Cause**: notifications table not created
- **Solution**: Run script 005_create_messaging_and_reviews.sql

**Issue: "is_admin column does not exist" error**
- **Cause**: Database was created with an older version of script 001
- **Solution**: Run `scripts/007_add_is_admin_column.sql` to add the missing column

**Issue: `column listings.listing_type does not exist` (swipe/matching/search filters break)**
- **Cause**: Your Supabase project is missing later migrations that add `listings.listing_type`
- **Solution**: Run `scripts/016_add_listing_type_columns.sql` (and then `scripts/024_backfill_listing_type.sql`) in the Supabase SQL Editor

### Debug Mode

To enable verbose logging:

1. Add console.log statements with `[sitswap]` prefix
2. Check browser console for errors
3. Check your hosting provider logs for server-side errors
4. Check Supabase logs for database errors

### Getting Help

If you encounter issues:
1. Check the error message carefully
2. Search the codebase for similar implementations
3. Check Supabase logs in dashboard
4. Check browser console for client-side errors
5. Open an issue with the error details

## Next Steps

Once the platform is running, consider:

1. **Enable Resend for Email**: Set up RESEND_API_KEY to send real emails
2. **Add Background Checks**: Integrate Checkr API for verification (planned)
3. **Custom Domain**: Add your domain in your hosting provider settings
4. **Analytics**: Monitor usage with PostHog or similar
5. **Mobile App**: Consider React Native implementation
6. **Payment Processing**: Enable live mode in Stripe
7. **Insurance Integration**: Partner with insurance provider API
8. **Marketing**: Set up SEO, social media, content marketing

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Enable 2FA for admin accounts
- [ ] Review RLS policies
- [ ] Set up rate limiting
- [ ] Enable HTTPS
- [ ] Configure CSP headers
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Backup strategy in place
- [ ] GDPR compliance review
- [ ] Terms of Service published
- [ ] Privacy Policy published

## Admin Management Best Practices

1. **Limit Super Admins**: Only give super_admin role to trusted individuals
2. **Use Moderators**: For content moderation tasks, use the moderator role
3. **Regular Audits**: Review admin access quarterly
4. **Offboarding**: Immediately revoke admin access when team members leave
5. **Two-Factor Authentication**: Enable 2FA for all admin accounts (coming soon)
6. **Activity Logging**: Monitor admin actions in the audit log (coming soon)

---

**Congratulations!** Your SitSwap platform is now set up with professional admin management! 🎉
