-- Admin and Safety Tables

-- Safety reports table
CREATE TABLE IF NOT EXISTS public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id),
  reported_user_id UUID REFERENCES public.profiles(id),
  report_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(255),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin roles table (simple role management)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- RLS for safety reports
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating them to make script idempotent
DROP POLICY IF EXISTS "Users can create safety reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can update all reports" ON public.safety_reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.safety_reports;

-- Users can create their own reports
CREATE POLICY "Users can create safety reports"
  ON public.safety_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.safety_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view/manage all reports
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

-- RLS for admin users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating them
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Allow first admin creation" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can read admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admins" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can delete admins" ON public.admin_users;

-- Admins can read their own admin record
CREATE POLICY "Admins can read own admin record"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = id);

-- Only super admins can list all admins
CREATE POLICY "Super admins can read admin list"
  ON public.admin_users FOR SELECT
  USING (public.is_super_admin());

-- Super admins can insert new admins
CREATE POLICY "Super admins can manage admins"
  ON public.admin_users FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Super admins can update admin roles/permissions
CREATE POLICY "Super admins can update admins"
  ON public.admin_users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Super admins can revoke admins
CREATE POLICY "Super admins can delete admins"
  ON public.admin_users FOR DELETE
  USING (public.is_super_admin());

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON public.safety_reports(status);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON public.safety_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reported ON public.safety_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
