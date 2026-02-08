# Release Train and Rollback SOP

## Cadence

- Production releases: weekly (or hotfix as needed).
- Code freeze: 24 hours before scheduled release.
- Required signoff: engineering + operations.

## Release Checklist

1. CI gates pass on release branch:
   - `npm run check:ci`
   - `Critical E2E` job (`npm run test:e2e:critical`)
   - `Database Integration` job (`npm run test:scripts:db:required`)
2. Apply DB migrations in staging first (`scripts/033` through latest).
3. Run `npm run smoke:migrations` against staging.
4. Execute staging parity checklist (`docs/STAGING_PARITY_CHECKLIST.md`).
5. Verify alerting and dashboards are green.
6. Publish release notes using template (`docs/templates/RELEASE_NOTES_TEMPLATE.md`).

## Production Rollout

1. Deploy split apps:
   - admin app first
   - set `NEXT_PUBLIC_ADMIN_APP_URL` + `ADMIN_APP_URL` on web app
   - deploy web app
2. Apply pending migrations (if any).
3. Run post-deploy smoke checks:
   - `/api/health`
   - `npm run verify:split-deploy` (web `/admin` redirect + admin login reachability)
   - booking/payment flow sanity
   - admin access sanity
4. Monitor alerts and logs for 30 minutes.

## Rollback SOP

1. If severe incident:
   - roll back app deploy to last known-good revision.
2. For migration-related failures:
   - stop writes if integrity risk exists,
   - execute targeted rollback SQL (do not blanket revert without incident review),
   - run smoke checks.
3. Communicate status in incident channel and update public status if customer-impacting.
