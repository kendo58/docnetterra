# Staging Parity Checklist

Use this checklist before promoting a release from staging to production.

## 1) Environment Parity

- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to staging project.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set for staging.
- [ ] Stripe values are set and environment-specific:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Safety gates are set:
  - [ ] `ALLOW_MANUAL_BOOKING_PAYMENTS=false`
  - [ ] `SITSWAP_WORKER_ENABLED=true`
  - [ ] `ALLOW_EMAIL_LOG_FALLBACK=false` (recommended)
- [ ] Worker and email env are configured:
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`
  - [ ] Worker tuning vars if customized (`JOBS_*`).

## 2) Schema + RLS Parity

- [ ] Applied migrations through `scripts/036_add_hot_path_indexes.sql` in staging.
- [ ] Verified migration order and SQL checks in `docs/MIGRATION_RUNBOOK.md`.
- [ ] Confirmed admin and payment RPC permission hardening from `scripts/034_harden_internal_rpc_permissions.sql`.
- [ ] Confirmed storage bucket exists (`SUPABASE_STORAGE_BUCKET`, default `uploads`).

## 3) Webhook + Worker Parity

- [ ] Stripe webhook endpoint points to staging URL:
  - [ ] `POST /api/stripe/webhook`
- [ ] Stripe emits and staging receives `payment_intent.succeeded`.
- [ ] `stripe_webhook_events` table receives dedupe records.
- [ ] Worker process is deployed and healthy:
  - [ ] `npm run worker` equivalent is running in staging infra.
  - [ ] Queue depth is stable (jobs are consumed).
  - [ ] Failed jobs are retried with backoff.

## 4) Automated Smoke Checks

- [ ] Run migration smoke checks:

```bash
npm run smoke:migrations
```

- [ ] Run app quality gate:

```bash
npm run check
```

- [ ] Run smoke load test baseline:

```bash
npm run loadtest:smoke -- --base-url https://staging.example.com
```

## 5) Manual Functional Checks

- [ ] Auth: signup/login/signout.
- [ ] Listings: create/edit/view/search.
- [ ] Bookings: create -> accept/confirm -> cancel path.
- [ ] Payment: checkout opens and webhook finalizes booking payment.
- [ ] Messaging and notifications: send/receive/read state.
- [ ] Admin: grant/revoke access and role updates.

## 6) Evidence + Signoff

- [ ] Record git SHA, date/time, and operator.
- [ ] Attach `smoke:migrations` output.
- [ ] Attach `loadtest:smoke` output.
- [ ] Attach screenshots/logs for manual checks.
- [ ] Signoff from engineering + operations owner.
