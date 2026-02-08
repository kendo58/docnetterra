# Release Checklist

## Before you cut a release

- Confirm Node/npm versions (`.nvmrc`, `package.json#packageManager`)
- Run `npm run check:ci` locally or in CI
- Verify `.env.example` matches required runtime env vars
- Review database migrations/scripts in `scripts/` and apply them to staging
- Smoke test critical flows:
  - Signup/login
  - Search + listing details
  - Messaging/notifications
  - Admin access (if enabled)

## Deploy

- Deploy to staging first (same build artifact settings as prod)
- Verify health endpoint: `/api/health`
- Verify observability:
  - `x-request-id` present on API responses
  - Error capture configured (Sentry DSN if enabled)

## After deploy

- Monitor logs + error rate for at least 30 minutes
- Validate payment flows (if Stripe is enabled)
- Create a tagged release and add release notes

