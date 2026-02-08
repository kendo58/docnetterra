# Required Skills to Ship SitSwap as a Commercial Product

This document defines the skill set required to execute `dev-plan.md` to completion.

## 1) Product Engineering (Next.js + TypeScript)

- Build/maintain App Router pages, server actions, API routes, and shared UI components.
- Refactor safely with strong typing and backward compatibility.
- Maintain maintainable architecture boundaries (`app/`, `components/`, `lib/`, `scripts/`).

Done when:

- Critical flows are robust and code reviews consistently pass without architecture regressions.

## 2) Supabase + PostgreSQL + RLS Engineering

- Design migrations safely and idempotently.
- Enforce correctness with constraints, transactions, RPCs, and permission boundaries.
- Validate RLS policies and service-role-only internals.

Done when:

- Schema changes are reproducible and secure across staging/production.

## 3) Payments Engineering (Stripe)

- Build secure checkout/session flows.
- Implement webhook signature verification, idempotency, replay safety, and state reconciliation.
- Model failure/retry handling without double-charge/double-credit issues.

Done when:

- Booking/payment lifecycle is correct under retries, duplicates, and concurrency.

## 4) Security Engineering

- Threat model high-risk surfaces (authz, user input, upload, payments, admin controls).
- Add strict validation, rate limiting, auditability, and least-privilege access.
- Verify production config gates and secret management practices.

Done when:

- No unresolved high/critical vulnerabilities remain in app-layer review.

## 5) QA + Test Engineering

- Expand unit, integration, and E2E coverage for revenue and trust-critical paths.
- Build reliable CI checks and flaky-test reduction workflow.
- Add regression tests for every production incident class.

Done when:

- CI catches regressions in booking, payment, admin, and messaging paths before merge.

## 6) Observability + SRE

- Operate logs, request IDs, metrics, alerts, and runbooks.
- Define and monitor SLIs/SLOs for API health, payment success, and queue reliability.
- Prepare incident response and rollback procedures.

Done when:

- On-call can detect, diagnose, and mitigate major incidents quickly.

## 7) DevOps + Release Management

- Harden CI/CD pipelines, environment promotion flow, and release checklists.
- Ensure reproducible deploys with rollback paths and post-deploy verification.
- Keep dependency/vulnerability hygiene current.

Done when:

- Releases are low-drama, auditable, and reversible.

## 8) Domain + Trust & Safety Operations

- Encode marketplace rules (booking lifecycle, cancellations, reviews, moderation).
- Ensure admin tooling supports real operational workflows.
- Maintain abuse handling and escalation pathways.

Done when:

- Operations team can run daily moderation and support safely from built-in tools.

## 9) Documentation + Technical Writing

- Keep architecture/lifecycle/runbook docs aligned with code.
- Write operator-grade docs (not just developer notes).
- Keep setup/release/incident docs current.

Done when:

- A new engineer can deploy, debug, and operate the system using repo docs alone.

## Skill Coverage Notes

- Current strongest coverage: product engineering, database primitives, base payment flow.
- Highest remaining gaps to close now:
  - Admin operations UX completion
  - Deep integration tests for payment/admin APIs
  - Production runbooks/alerts hardening

