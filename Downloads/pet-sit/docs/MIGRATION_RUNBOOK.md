# Migration Runbook (Staging -> Production)

Use this runbook for every schema rollout.

## Preconditions

- Staging and production backups/snapshots are available.
- `npm run check` passes on the release commit.
- Target scripts are reviewed and idempotent.
- Stripe webhook secret and worker env are configured.

## Apply Order

Run SQL scripts in ascending order, especially:

1. `scripts/025_add_search_and_geo_infra.sql`
2. `scripts/026_add_cache_rate_limit_and_jobs.sql`
3. `scripts/027_add_booking_requester.sql`
4. `scripts/028_add_booking_payments_and_points.sql`
5. `scripts/029_update_addresses_policy_for_paid_bookings.sql`
6. `scripts/030_prevent_self_booking.sql`
7. `scripts/031_add_booking_overlap_guard.sql`
8. `scripts/032_add_stripe_webhook_events.sql`
9. `scripts/033_add_atomic_booking_payment_rpc.sql`
10. `scripts/034_harden_internal_rpc_permissions.sql`
11. `scripts/035_backfill_booking_payment_consistency.sql`
12. `scripts/036_add_hot_path_indexes.sql`

## Staging Verification

Run these checks in Supabase SQL editor after applying scripts:

```sql
-- Webhook dedupe table exists
select to_regclass('public.stripe_webhook_events');

-- Payment RPC signature(s) present
select to_regprocedure('public.pay_booking_with_points(uuid,uuid,integer,numeric,numeric,numeric,numeric,timestamptz)');
select to_regprocedure('public.pay_booking_with_points(uuid,uuid,integer,numeric,numeric,numeric,numeric,timestamptz,numeric)');

-- RPC permission hardening present
select routine_name, specific_name
from information_schema.routine_privileges
where routine_schema='public'
  and routine_name='pay_booking_with_points';
```

App-level checks in staging:

- Create booking -> confirm -> payment page opens.
- Cash payment path reaches Stripe and finalizes via webhook.
- Points-only payment path succeeds.
- Admin user role update and revoke flows work.
- `/api/health` returns `ok` or expected `degraded` issues only.

Automated checks:

```bash
npm run smoke:migrations
npm run loadtest:smoke -- --base-url https://staging.example.com
```

## Production Rollout

1. Put production in low-traffic deployment window.
2. Apply same scripts in same order.
3. Run SQL verification queries.
4. Run smoke tests:
   - login/signup
   - search/listing details
   - booking create/confirm
   - payment webhook reconciliation
   - admin role changes
5. Monitor logs, error rate, queue failures for 30-60 minutes.

## Rollback Strategy

- If migration fails before commit: fix and rerun (scripts are idempotent).
- If migration succeeds but app regression appears:
  - Roll back app deploy first.
  - For schema rollback, apply targeted reverse SQL only after incident review.
  - Prefer forward-fix migration over destructive rollback for booking/payment tables.

## Post-Rollout Signoff

- Record rollout timestamp, operator, and git SHA.
- Record query outputs from verification checks.
- Attach smoke-test evidence in release notes.
- Validate staging parity checklist: `docs/STAGING_PARITY_CHECKLIST.md`.
- Validate observability + runbook docs: `docs/OBSERVABILITY_ALERTS.md`, `docs/runbooks/payments-outage.md`, `docs/runbooks/auth-outage.md`.
