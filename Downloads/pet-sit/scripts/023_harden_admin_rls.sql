-- Admin RLS Hardening
-- Run after `006_create_admin_tables.sql` to tighten admin/security-related policies.

-- Helper functions for RLS checks (avoid recursive policy definitions)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- Harden safety_reports visibility: reporters see their own, admins can manage all.
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can update all reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.safety_reports;

CREATE POLICY "Admins can view all reports"
  ON public.safety_reports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all reports"
  ON public.safety_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reports"
  ON public.safety_reports FOR DELETE
  USING (public.is_admin());

-- Harden admin_users: admins can read their own row; only super_admin can list/manage admins.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Allow first admin creation" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can read admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admins" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can delete admins" ON public.admin_users;

CREATE POLICY "Admins can read own admin record"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Super admins can read admin list"
  ON public.admin_users FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can manage admins"
  ON public.admin_users FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update admins"
  ON public.admin_users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete admins"
  ON public.admin_users FOR DELETE
  USING (public.is_super_admin());

