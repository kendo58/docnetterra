# Runbook: Payments Outage

Use this when booking payments fail, Stripe webhook failures spike, or paid bookings are not being finalized.

## Detection Signals

- Alert: webhook failures (`api.stripe.webhook_error`) above threshold.
- Alert: payment finalization failures (`finalized=false`) above threshold.
- Support reports: users charged but booking remains unpaid.

## Immediate Mitigation

1. Check `/api/health` and confirm env issues are not reported (`STRIPE_WEBHOOK_SECRET_missing`, `server_env_invalid`).
2. Verify webhook endpoint status in Stripe dashboard (delivery failures, signature errors).
3. Confirm `stripe_webhook_events` exists and is writable:
   - `select count(*) from stripe_webhook_events;`
4. Verify worker health if emails/notifications are delayed:
   - `select status, count(*) from jobs group by status;`

## Triage Steps

1. Inspect recent webhook errors:
   - Filter logs by `api.stripe.webhook_error` and `requestId`.
2. For affected booking:
   - Confirm `bookings.stripe_payment_intent_id` matches Stripe event.
   - Validate `payment_status`, `paid_at`, and `payment_method`.
3. Validate migration level:
   - Confirm `033`, `034`, `035`, `036` are applied.
4. Confirm RPC availability:
   - `select * from pay_booking_with_points(...)` via smoke checks (`npm run smoke:migrations`).

## Recovery

1. Re-deliver failed Stripe events from Stripe dashboard after root cause fix.
2. If event retries are exhausted, replay events manually using Stripe CLI/test tooling.
3. For stuck bookings with proven successful payments, run controlled remediation SQL with audit trail.

## Post-Incident

1. Record impact window and affected bookings.
2. Add regression test for root cause class.
3. Update this runbook and alert thresholds if detection lagged.

