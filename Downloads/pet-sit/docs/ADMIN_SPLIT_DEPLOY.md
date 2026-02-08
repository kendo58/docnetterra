# Admin Split Deploy Guide

This project now supports a production-grade split deploy model:

- `web app` deployment serves customer-facing routes.
- `admin app` deployment serves `/admin/*` routes on a dedicated origin.

## Why

- Reduces blast radius of admin-only regressions.
- Enables stricter network, auth, and operations policies for admin traffic.
- Allows independent deploy cadence for admin tooling.

## In-Repo Artifacts

- Main app redirect boundary: `proxy.ts`
- Admin URL resolution helper: `lib/routing/admin-portal.ts`
- Standalone admin app project: `apps/admin`
- Shared admin server actions (used by both apps without cross-app route imports): `lib/admin/actions.ts`

## Decoupling Boundary (Current)

- `apps/admin` now owns real admin route files under `apps/admin/app/admin/**`.
- `apps/admin` no longer re-exports `app/admin/**` route modules from the main app.
- Admin write/read operations are imported from `lib/admin/actions.ts` rather than `app/actions/admin.ts`.
- Main app keeps `app/actions/admin.ts` as a compatibility shim that re-exports shared actions.

## Required Production Env

Set on the **main app** deployment:

- `NEXT_PUBLIC_ADMIN_APP_URL=https://admin.example.com`
  - Optional server-only override: `ADMIN_APP_URL` (takes precedence)

Set on the **admin app** deployment:

- same Supabase/Stripe/app envs needed by admin routes and actions
- `NEXT_PUBLIC_APP_URL` should point to admin origin

## Deploy Steps

1. Deploy main app as usual.
2. Build/deploy admin app from `apps/admin`:
   - `npm run admin:build`
   - run with your platform using `apps/admin` as app root.
3. Set `NEXT_PUBLIC_ADMIN_APP_URL` on the main app to the admin deployment URL.
4. Validate:
   - `https://app.example.com/admin` -> redirects to `https://admin.example.com/admin`
   - admin login and moderation flows work on admin origin.

## CI/CD Automation (Fly)

- Workflow: `.github/workflows/deploy-fly-split.yml`
- Environment setup and required vars/secrets: `docs/FLY_SPLIT_DEPLOY_PIPELINE.md`

## Local Verification

1. Run customer app:
   - `npm run dev`
2. Run admin app:
   - `PORT=3100 npm run admin:dev`
3. Optional redirect simulation:
   - set `NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3100`
   - browse `http://localhost:3000/admin` and verify redirect.
