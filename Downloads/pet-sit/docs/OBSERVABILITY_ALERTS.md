# Observability Alerts and Thresholds

Use these baseline thresholds for staging and production monitors.

## API and App Health

- **`/api/health` degraded for 5 minutes**
  - Trigger: `status != "ok"` for 5 consecutive checks (1-minute interval).
  - Severity: warning.
- **HTTP 5xx rate elevated**
  - Trigger: `5xx / total_requests > 2%` over 5 minutes.
  - Severity: critical.
- **P95 request latency elevated**
  - Trigger: `p95 > 1200ms` over 10 minutes for authenticated APIs.
  - Severity: warning.

## Payments and Webhooks

- **Stripe webhook processing failures**
  - Trigger: `api.stripe.webhook_error` count >= 3 in 5 minutes.
  - Severity: critical.
- **Webhook duplicate ratio spike**
  - Trigger: `api.stripe.webhook.duplicate / webhook_events > 15%` over 15 minutes.
  - Severity: warning.
- **Booking fee finalization failures**
  - Trigger: `api.stripe.webhook.booking_fee_finalize finalized=false` count >= 5 in 10 minutes.
  - Severity: critical.

## Background Jobs and Email Delivery

- **Queued jobs backlog**
  - Trigger: `jobs(status in queued,retry)` > 500 for 10 minutes.
  - Severity: warning.
- **Oldest queued job age**
  - Trigger: oldest queued/retry job older than 5 minutes.
  - Severity: critical.
- **Email job hard failures**
  - Trigger: `jobs(task=email.send,status=failed)` count >= 10 in 15 minutes.
  - Severity: critical.

## Auth and Admin

- **Admin auth failures spike**
  - Trigger: `admin login failures >= 20` in 10 minutes.
  - Severity: warning.
- **Role/permission change audit gaps**
  - Trigger: admin role change actions without matching audit log in 5 minutes.
  - Severity: warning.

## Alert Routing

- Warning: on-call Slack channel.
- Critical: pager + Slack.
- Include `requestId`, endpoint/action name, affected booking/payment/admin IDs whenever available.

