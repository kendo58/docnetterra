# SitSwap Production Dev Plan

This is the execution plan to take SitSwap from "feature-complete demo" to "commercially production-ready."

## Definition of Done (Production-Ready)

The app is production-ready when all items below are true:

- `npm run check:ci` passes in CI on every PR.
- Critical user flows are covered by automated integration/E2E tests:
  - auth, listing create/edit, booking request/accept/cancel, payment, messaging, review, admin moderation.
- Payment and booking lifecycle is safe and idempotent under retries/concurrency.
- Security controls are in place for authz, input validation, abuse prevention, and secrets handling.
- Observability is operational (request IDs, error tracking, actionable alerts, runbooks).
- Database migrations are deterministic, backward-compatible, and applied in staging then production.
- Release process is documented and repeatable with rollback procedures.

## Current State Snapshot (from repo audit)

- Strengths:
  - Check pipeline exists (`check`, `check:ci`) and currently passes.
  - Stripe webhook verification + event dedupe exists.
  - Atomic booking payment RPC and permission hardening scripts exist.
  - Worker + jobs system exists for async tasks.
  - Admin surface now supports split-deploy routing via dedicated admin origin redirect (`NEXT_PUBLIC_ADMIN_APP_URL`).
- Gaps:
  - Stage/prod migration verification (`033`–`036`) still requires operator execution evidence.
  - Critical E2E and database-integration CI gates require secrets to be configured in the target CI environment.
  - Split-admin architecture is implemented in-repo (`apps/admin` owns admin routes), but production cutover still requires operator rollout (separate runtime/domain + CI target wiring).
  - Production readiness remains blocked on external rollout signoff, not local code quality gates.

## Phase Plan

## Phase 1: Critical Security + Correctness (P0)

- [x] Harden booking fee webhook amount/currency validation and finalize only on `payment_intent.succeeded`.
- [x] Add backward-compatible `p_cash_paid` payment RPC usage path in app code.
- [ ] Deploy/verify new SQL signatures in staging + production (`033`, `034`).
- [x] Complete admin access UX (grant by email, role updates, revoke).
- [x] Remove admin auth bypass paths and enforce admin role checks on all admin surfaces.
- [x] Replace placeholder admin health metrics and non-functional user-management controls with live data + real filters.
- [x] Add strict request validation on high-risk write endpoints (notifications/reviews/admin actions).
- [x] Add rate limiting where missing on write-heavy/public APIs.
- [x] Enforce production config gates (manual payment disabled, webhook secret required, worker required).

Acceptance criteria:

- No "coming soon" controls remain in critical admin permission flows.
- High-risk write endpoints reject invalid payloads with explicit 4xx responses.
- Payment finalization cannot succeed on mismatched amount/currency.

## Phase 2: Data Integrity + Migration Safety (P0)

- [x] Add migration runbook with order, verification queries, and rollback strategy.
- [x] Add idempotent data-fix scripts for legacy rows (payment metadata consistency).
- [x] Add post-migration smoke checks as scripts.
- [x] Add staging parity checklist (env vars, RLS, webhooks, worker).

Acceptance criteria:

- Fresh environment bootstrap is scriptable and deterministic.
- Upgrade path from current production schema is documented and tested.

## Phase 3: Test Hardening (P0/P1)

- [x] Add integration tests for `/api/stripe/webhook`:
  - valid signature + payment success
  - duplicate event
  - insufficient amount
  - wrong currency
  - transient DB failure retry behavior
- [x] Add integration tests for admin role management actions.
- [x] Add E2E booking-to-payment happy path and cancellation/refund path.
- [x] Add contract tests for environment validation and health degradation signals.

Acceptance criteria:

- CI fails on any regression in booking/payment/admin critical paths.
- Tests cover success, retry, duplicate, and failure semantics.

## Phase 4: Reliability + Observability (P1)

- [x] Define alert thresholds (5xx rate, webhook failures, failed jobs, queue latency).
- [x] Add dashboards for booking/payment funnel and job outcomes.
- [x] Add structured log fields for booking/payment/admin events.
- [x] Add incident runbook (`docs/runbooks/*.md`) for payments and auth outages.

Acceptance criteria:

- On-call can detect and triage payment/job issues within minutes.

## Phase 5: Performance + Cost Controls (P1)

- [x] Profile high-traffic pages/search and reduce slow queries.
- [x] Add DB indexes for observed hot paths (validated with explain plans).
- [x] Set and test cache TTL policies for geocode/search artifacts.
- [x] Add load test scripts for key APIs and webhook ingestion.

Acceptance criteria:

- P95 latency targets met for public APIs and key authenticated workflows.

## Phase 6: Commercial Launch Readiness (P1/P2)

- [x] Finalize transactional email delivery provider config and monitoring.
- [x] Finalize legal/compliance artifacts (ToS/Privacy updates, incident policy).
- [x] Finalize release train (staging signoff checklist, rollback SOP, release notes template).
- [x] Finalize support workflows (triage labels, SLA expectations, escalation path).
- [x] Add split-deploy support for a dedicated admin origin (`/admin/*` redirect boundary).

Acceptance criteria:

- Team can operate the app safely for paying customers.

## Execution Order

1. Phase 1 (security/correctness blockers)
2. Phase 2 (migration safety)
3. Phase 3 (test hardening)
4. Phase 4 (observability)
5. Phase 5 (performance)
6. Phase 6 (commercial operations)

## Active Execution Log

- 2026-02-07: Payment/webhook hardening completed (amount/currency enforcement, `p_cash_paid` path, docs update, full checks passing).
- 2026-02-07: Admin permissions workflow completed (grant-by-email, role updates, super-admin safety guardrails).
- 2026-02-07: Notifications/reviews API hardening completed (rate limiting + payload validation).
- 2026-02-07: Added route-level unit tests for new validation behaviors and re-ran full `npm run check` successfully.
- 2026-02-07: Hardened uploads with file-signature validation to block MIME spoofing and mismatched content types.
- 2026-02-07: Health/config hardening completed (server env parse degradation handling, worker/config production gates, updated production startup checks).
- 2026-02-07: Webhook safety tightened to fail closed in production if idempotency table is missing; added route tests for this behavior.
- 2026-02-07: Worker email fallback hardened to avoid silent success with SMTP misconfiguration and reduce PII logging risk.
- 2026-02-07: Deep bug/security review documented with prioritized fixed/open risks (`docs/DEEP_CODE_REVIEW.md`).
- 2026-02-07: Reviews API identifier validation tightened (UUID checks for POST/GET inputs) with unit coverage.
- 2026-02-07: E2E suite revalidated (`3 passed`, `1 skipped auth due to missing E2E creds`); Playwright now sets `SITSWAP_SKIP_PROD_CONFIG_CHECK=true` for test web server boot.
- 2026-02-07: Added `scripts/035_backfill_booking_payment_consistency.sql` for idempotent legacy payment metadata normalization.
- 2026-02-07: Added `scripts/post-migration-smoke-checks.mjs` and `npm run smoke:migrations` for staging/prod post-migration verification.
- 2026-02-07: Added `docs/STAGING_PARITY_CHECKLIST.md` and linked rollout docs (`README.md`, `SETUP.md`, `docs/MIGRATION_RUNBOOK.md`).
- 2026-02-07: Expanded Stripe webhook route tests for success/duplicate/amount/currency/retry behavior and hardened retry safety by releasing dedupe records on transient failure.
- 2026-02-07: Added admin role-management action tests (`tests/unit/actions.admin.roles.test.ts`) and env-gated booking/cancellation Playwright coverage (`e2e/booking-payment.spec.ts`).
- 2026-02-07: Added observability + operations docs (`docs/OBSERVABILITY_ALERTS.md`, `docs/DASHBOARD_METRICS.md`, `docs/runbooks/*`) and structured logging for payment/admin role events.
- 2026-02-07: Added performance hardening (`scripts/036_add_hot_path_indexes.sql`, `lib/cache/policies.ts`, authenticated search caching, load test runner `scripts/load-test.mjs`).
- 2026-02-07: Added commercial launch process docs (`docs/EMAIL_DELIVERY_OPERATIONS.md`, `docs/LEGAL_AND_COMPLIANCE_CHECKLIST.md`, `docs/RELEASE_TRAIN.md`, `docs/SUPPORT_WORKFLOWS.md`, `docs/templates/RELEASE_NOTES_TEMPLATE.md`).
- 2026-02-07: Removed manual booking-ID dependency for payment/cancellation E2E by auto-seeding booking fixtures in Playwright global setup (`e2e/global-setup.ts`, `e2e/booking-fixtures.ts`).
- 2026-02-07: Added strict CI gate for auth/booking critical E2E (`npm run test:e2e:critical`) with explicit env assertions (`scripts/assert-e2e-env.mjs`).
- 2026-02-07: Hardened E2E fixture lifecycle with lazy fixture resolution and global-setup cleanup of prior fixture listings/bookings to avoid stale-ID and data-bloat failures.
- 2026-02-07: Added same-origin CSRF-style guards on authenticated write APIs (`/api/notifications` PATCH, `/api/reviews` POST, `/api/upload` POST), fixed geocode internal-failure status to 500, and removed `any`/unused-catch warnings from `app/actions/admin.ts` with passing tests/checks.
- 2026-02-07: Further lint/type burn-down in server actions by removing `any` from match and notification actions (`app/actions/match-notifications.ts`, `app/actions/notifications.ts`), preserving behavior and revalidating full check pipeline.
- 2026-02-07: Removed build-blocking type regressions introduced during warning burn-down (`app/availability/page.tsx`, `app/favorites/page.tsx`, `app/matches/page.tsx`, `app/search/page.tsx`, `app/users/[id]/page.tsx`) and revalidated with full `npm run check`.
- 2026-02-07: Continued warning/risk burn-down in critical app flows and feature components (`app/bookings/[id]/page.tsx`, `app/dashboard/page.tsx`, `app/listings/[id]/page.tsx`, `app/user/[id]/page.tsx`, booking/messaging/settings/reporting components), reducing lint warnings to `126` with `npm run check` passing.
- 2026-02-07: Deep warning/type burn-down across matching/swipe/realtime/upload/shared utilities and tests (`components/features/*`, `components/ui/*`, `lib/*`, `scripts/create-admin.ts`, `tests/*`), resolved resulting build regressions, reduced lint warnings from `126` to `27` (remaining in `mobile/src/**`), and revalidated with `npm run check` + `npm run test:e2e`.
- 2026-02-07: Added mobile-specific lint override for React Native files in `eslint.config.mjs`, resolved final nullable typing regressions (`components/features/notification-bell.tsx`, `components/features/possible-matches.tsx`, `lib/utils/listing-ranking.ts`), and achieved a clean `npm run lint` (0 warnings) with full `npm run check` passing.
- 2026-02-07: Enforced DB integration as a CI gate by adding `scripts/assert-db-test-env.mjs`, strict-mode handling in `scripts/tests/test-database-integration.ts`, new npm scripts (`test:scripts:db`, `test:scripts:db:required`), and a `Database Integration` job in `.github/workflows/ci.yml`; updated `README.md`, `SETUP.md`, and `docs/RELEASE_TRAIN.md` accordingly.
- 2026-02-07: Hardened admin security + trust UX by removing admin auth bypass enforcement paths (`app/admin/(protected)/layout.tsx`, `app/actions/admin.ts`, `lib/env/server.ts`), requiring admin auth in audit read helpers (`lib/audit.ts`), replacing placeholder dashboard health metrics with computed live metrics (`app/admin/(protected)/page.tsx`), wiring real user-management filters/pagination (`app/admin/(protected)/users/page.tsx`, `app/actions/admin.ts`), and replacing browser alert/confirm flows with dialog/toast UX (`components/admin/admin-user-actions.tsx`); docs updated in `SETUP.md`, `ADMIN_SETUP.md`, and `docs/DEEP_CODE_REVIEW.md`.
- 2026-02-07: Added production split-deploy boundary for admin with dedicated-origin redirect support in proxy (`proxy.ts`, `lib/routing/admin-portal.ts`) controlled by `NEXT_PUBLIC_ADMIN_APP_URL`/`ADMIN_APP_URL`, with unit coverage (`tests/unit/admin-portal-routing.test.ts`) and setup/doc updates (`.env.example`, `README.md`, `SETUP.md`).
- 2026-02-07: Completed in-repo admin decoupling by extracting shared admin actions to `lib/admin/actions.ts`, converting `app/actions/admin.ts` to a compatibility re-export shim, switching admin imports away from `@/app/actions/admin`, and replacing `apps/admin` route wrappers with owned route files under `apps/admin/app/admin/**`; validated with `npm run check` and `npm run test:e2e`.
- 2026-02-07: Added decoupling regression guard test (`scripts/tests/test-admin-decoupling.ts`) into script test runner and stabilized repeat checks by ignoring nested Next artifacts (`**/.next/**`) in `eslint.config.mjs`; revalidated with clean `npm run check` + `npm run test:e2e`.
- 2026-02-08: Added split deploy automation for Fly (`Dockerfile.admin`, `deploy/fly/*.toml`, `.github/workflows/deploy-fly-split.yml`) that deploys admin first, wires `NEXT_PUBLIC_ADMIN_APP_URL`/`ADMIN_APP_URL` on web, deploys web, and runs split-route + smoke verification (`scripts/verify-split-deploy.mjs`, `npm run verify:split-deploy`); local verifier tested successfully against dual local runtimes.
- 2026-02-08: Deployment execution from this workstation is blocked by missing Fly auth token (`flyctl auth whoami` -> no access token). CI pipeline is fully wired and ready once staging/production GitHub environment vars/secrets are populated.
