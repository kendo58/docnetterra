# Runbook: Auth Outage

Use this when users cannot log in/sign up, session checks fail, or protected routes loop to login.

## Detection Signals

- Elevated 401/403 rates on authenticated APIs.
- Support reports for login/signup failures.
- `/api/health` reports `public_env_invalid` or `server_env_invalid`.

## Immediate Mitigation

1. Confirm Supabase auth availability from provider status page.
2. Validate runtime env values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Verify redirect URLs in Supabase auth settings match deployed domains.
4. Confirm app proxy/session middleware is healthy.

## Triage Steps

1. Reproduce locally against staging with production-equivalent env.
2. Inspect auth-related logs and request IDs for failing flows.
3. Check `profiles` trigger path:
   - ensure users can still create/resolve profile rows.
4. Validate admin login separately (`/admin/login`) to isolate role/RLS issues.

## Recovery

1. Roll back recent auth config or deployment changes if outage started after release.
2. Restore known-good env values and redeploy.
3. Run smoke checks:
   - `npm run check`
   - `npm run test:e2e` (auth suite requires E2E auth env)

## Post-Incident

1. Document root cause and blast radius.
2. Add targeted guardrails/tests for the failed condition.
3. Update release checklist with any missing preflight checks.

