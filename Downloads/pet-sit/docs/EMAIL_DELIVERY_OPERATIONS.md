# Email Delivery Operations

This document defines production requirements for transactional email delivery.

## Required Provider Setup

1. Configure SMTP provider credentials:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
2. Configure sender domain SPF, DKIM, and DMARC.
3. Set `SITSWAP_WORKER_ENABLED=true` in production.

## Monitoring

- Queue health:
  - monitor `jobs` with `task='email.send'` by status.
- Delivery quality:
  - provider dashboard alerts for bounce, complaint, suppression rates.
- App-side retries:
  - monitor jobs in `retry` and `failed` states.

## Operational SLO Targets

- Email enqueue success: >= 99.9%.
- Email send job success (within retries): >= 99.5%.
- P95 enqueue-to-send latency: <= 2 minutes.

## Failure Handling

1. If SMTP credentials are missing in production, worker should fail and retry (no silent success).
2. If provider outage occurs:
   - keep queueing jobs,
   - monitor backlog growth,
   - replay delayed jobs when provider recovers.

