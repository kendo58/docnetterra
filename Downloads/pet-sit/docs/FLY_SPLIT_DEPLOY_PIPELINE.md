# Fly Split Deploy Pipeline (Web + Admin)

This pipeline deploys:

- `web app` (customer-facing app)
- `admin app` (standalone admin portal on separate Fly app/domain)

It also sets `NEXT_PUBLIC_ADMIN_APP_URL` and `ADMIN_APP_URL` on the web app so `/admin/*` redirects to the admin origin.

## Workflow

- File: `.github/workflows/deploy-fly-split.yml`
- Trigger:
  - Push to `main` (staging deploy)
  - Manual dispatch for `staging` or `production`

## Required GitHub Environments

Create two GitHub environments:

1. `staging`
2. `production`

For each environment configure:

### Variables

- `FLY_WEB_APP` (Fly app name for web)
- `FLY_ADMIN_APP` (Fly app name for admin)
- `WEB_APP_URL` (public web base URL, e.g. `https://sitswap-staging.fly.dev`)
- `ADMIN_APP_URL` (public admin base URL, e.g. `https://sitswap-admin-staging.fly.dev`)

### Secrets

- `FLY_API_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Notes:

- The workflow uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for post-deploy smoke checks.
- App runtime secrets (Stripe, Supabase anon key, etc.) should be set on each Fly app via `fly secrets set`.

## Deployment Order (per environment)

1. Deploy admin app (`Dockerfile.admin`, `deploy/fly/admin.toml`).
2. Set web app admin-origin env:
   - `NEXT_PUBLIC_ADMIN_APP_URL=<ADMIN_APP_URL>`
   - `ADMIN_APP_URL=<ADMIN_APP_URL>`
3. Deploy web app (`Dockerfile`, `deploy/fly/web.toml`).
4. Verify split-deploy routing:
   - web `/admin` redirects to admin origin
   - admin `/admin/login` is reachable
   - web `/api/health` is healthy/degraded JSON
5. Run post-deploy smoke checks (`npm run smoke:migrations`).

## Manual Local Verification Command

```bash
SITSWAP_WEB_APP_URL=https://your-web-domain \
SITSWAP_ADMIN_APP_URL=https://your-admin-domain \
npm run verify:split-deploy
```
