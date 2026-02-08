# Contributing

Thanks for your interest in contributing to SitSwap.

## Prerequisites

- Node.js `>=20.9.0` (see `.nvmrc`)
- npm (see `package.json#packageManager`)

## Setup

1. Copy env vars: `cp .env.example .env.local`
2. Fill the required Supabase values in `.env.local`
3. Install deps: `npm ci`
4. Start dev: `npm run dev`

More detailed environment + database setup lives in:

- `SETUP.md`
- `ADMIN_SETUP.md`

## Quality gates

- Lint: `npm run lint`
- Typecheck: `npm run test:typecheck`
- Unit tests: `npm test`
- Script tests: `npm run test:scripts`
- E2E (smoke): `npm run test:e2e`
- Full local CI equivalent: `npm run check:ci`

## Pull request checklist

- Keep changes focused and small when possible
- Add/update tests for behavior changes
- Update docs when you change setup, env vars, or workflows
- Avoid committing secrets; use `.env.local` (ignored by git)

