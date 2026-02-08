# SitSwap Deep Code Review (Security + Bug Risk)

Review date: 2026-02-07

This review prioritizes correctness, abuse resistance, payment safety, and operational reliability for commercial launch.

## Critical Findings (Fixed)

1. Stripe webhook idempotency could fail open in production.
- Risk: duplicate payment events could be processed if `stripe_webhook_events` table was missing.
- Fix: production now fails closed when dedupe table is absent.
- Code: `app/api/stripe/webhook/route.ts`
- Tests: `tests/unit/api.stripe-webhook.test.ts`

2. Upload endpoint trusted client MIME type and allowed spoofing.
- Risk: non-image payloads could be uploaded with forged MIME headers.
- Fix: added binary signature sniffing (PNG/JPEG/WebP) and type/content mismatch rejection.
- Code: `app/api/upload/route.ts`, `lib/utils/upload.ts`
- Tests: `tests/unit/api.upload.sanitize.test.ts`

3. Health endpoint could throw on invalid server env.
- Risk: health checks become 500 instead of degraded status, obscuring incident triage.
- Fix: wrapped server env parsing and returns explicit `server_env_invalid` issue.
- Code: `app/api/health/route.ts`
- Tests: `tests/unit/api.health.test.ts`

4. Worker email fallback could silently "succeed" with no provider and log sensitive payloads.
- Risk: lost customer emails and potential PII leakage in logs.
- Fix: in production, missing SMTP now fails/retries job by default; fallback logging is controlled and minimal.
- Code: `scripts/worker.ts`

5. Webhook dedupe could block legitimate retries after transient processing failure.
- Risk: event inserted as processed before finalize failure; subsequent retries could be skipped as duplicate.
- Fix: release dedupe record when processing fails so Stripe retries can recover safely.
- Code: `app/api/stripe/webhook/route.ts`
- Tests: `tests/unit/api.stripe-webhook.test.ts`

6. Authenticated write APIs lacked origin checks for browser requests.
- Risk: cross-site request forgery attempts against cookie-authenticated endpoints.
- Fix: added trusted-origin validation guard and enforced it on write routes.
- Code: `lib/security/origin.ts`, `app/api/notifications/route.ts`, `app/api/reviews/route.ts`, `app/api/upload/route.ts`
- Tests: `tests/unit/api.notifications.test.ts`, `tests/unit/api.reviews.validation.test.ts`, `tests/unit/api.upload.route.test.ts`

7. Geocode API returned 200 on internal geocoder failures.
- Risk: monitoring and callers cannot distinguish upstream/data errors from successful responses.
- Fix: return explicit HTTP 500 for internal geocoder failures.
- Code: `app/api/geocode/route.ts`
- Tests: `tests/unit/api.geocode.route.test.ts`

8. Admin dev bypass could permit privileged actions in non-production environments.
- Risk: setting dev bypass flags enabled non-admin users to run admin server actions.
- Fix: removed admin auth bypass from protected layout and admin server actions.
- Code: `app/admin/(protected)/layout.tsx`, `app/actions/admin.ts`, `lib/env/server.ts`, `tests/unit/actions.admin.roles.test.ts`, `tests/unit/env.server.test.ts`

9. Audit-log read helpers did not enforce admin authorization directly.
- Risk: defense-in-depth gap if route-level protection changed or regressed.
- Fix: `getAuditLogs` and `getAuditStats` now require admin role before querying.
- Code: `lib/audit.ts`

10. Admin operations UI implied controls/metrics that were not real.
- Risk: operators could make decisions from placeholder health metrics or incomplete user datasets.
- Fix: wired user search/filter/pagination to server queries and replaced hardcoded health metrics with live computed values.
- Code: `app/admin/(protected)/users/page.tsx`, `app/actions/admin.ts`, `app/admin/(protected)/page.tsx`, `components/admin/admin-user-actions.tsx`

## High Findings (Open)

1. Critical CI gates depend on secret availability.
- Current status: CI includes `Critical E2E` and `Database Integration` jobs with fail-fast env assertions.
- Risk: if required Supabase/E2E secrets are missing in the CI target, release gating fails or cannot execute.
- Needed: maintain secret inventory and rotation ownership for E2E + DB integration credentials.

2. End-to-end booking-to-payment coverage still depends on seeded staging fixtures.
- Current status: booking payment + cancellation/refund Playwright flows are implemented, env-gated, and CI has a dedicated critical E2E job.
- Gap: critical E2E still skips if required auth/Supabase E2E credentials are not configured in the target environment.

## Medium Findings (Open)

1. Local database integration remains optional.
- Risk: developers may merge without running Supabase-backed tests locally.
- Mitigation: CI now has a required `Database Integration` job with env assertion and non-zero exit on failures.

2. Production operations checks rely on env gates but still require deployment verification.
- Needed: stage/prod runbook execution and signoff evidence for worker/webhook/alerts.

## Recommended Next Execution Slice

1. Execute stage/prod migration runbook (`033`–`036`) and archive smoke-check evidence.
2. Ensure CI secret rotation policy covers E2E + DB integration credentials.
3. Capture recurring explain-plan snapshots for hot booking/payment queries post-migration.
