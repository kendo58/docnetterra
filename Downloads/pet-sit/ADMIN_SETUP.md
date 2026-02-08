# Admin Access Setup Guide

SitSwap includes a secure, script-based admin bootstrap flow (recommended for staging/production), plus an optional UI-based helper for local development.

## Create Your First Admin (Recommended for Staging/Production)

1. Ensure your Supabase project is set up (run the SQL scripts in `scripts/` in filename order, including `006_create_admin_tables.sql`).
2. Set required env vars in `.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Run:

```bash
npm run admin:create -- --email you@example.com --password 'StrongPassword' --role super_admin
```

4. Sign in via `/admin/login`.

## Local Dev Convenience (Optional)

The one-time `/admin/setup` UI is available in local development to help verify your database/scripts, but it is **disabled in production**.

## Add More Admins

1. Sign in to the admin portal as a super admin.
2. Go to `/admin/admins`.
3. Use “Grant Admin Access” to promote another user.

## Development Security Posture

Admin auth bypass is disabled. Local development follows the same admin authentication model as production:

- Sign in via `/admin/login`
- User must exist in `admin_users` (or legacy `profiles.is_admin = true`)

## Legacy SQL (Only If Needed)

If you prefer a manual approach, you can promote a user by email:

```sql
-- Replace with the target email
UPDATE profiles
SET is_admin = true
WHERE email = 'user@example.com';

INSERT INTO admin_users (id)
SELECT id
FROM profiles
WHERE email = 'user@example.com'
ON CONFLICT (id) DO NOTHING;
```

To revoke access:

```sql
UPDATE profiles
SET is_admin = false
WHERE email = 'user@example.com';

DELETE FROM admin_users
WHERE id = (SELECT id FROM profiles WHERE email = 'user@example.com');
```

## Troubleshooting

**Issue: Can’t access `/admin/setup`**
- `/admin/setup` is disabled in production. Use `npm run admin:create` to create the first admin.

**Issue: Can’t sign in to admin**
- Use `/admin/login` (not `/auth/login`) and confirm the user is in `admin_users` or has `profiles.is_admin = true`.
