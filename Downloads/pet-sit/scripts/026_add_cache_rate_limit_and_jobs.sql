-- Cache, Rate Limiting, and Background Jobs (Infrastructure)
-- Safe to run multiple times.

-- ------------------------------
-- Shared cache (Postgres-backed)
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.cache_entries (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cache_entries ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: server-only via service role / SECURITY DEFINER functions.

CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON public.cache_entries(expires_at);

-- Cleanup helper (optional)
CREATE OR REPLACE FUNCTION public.cache_cleanup(max_rows integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH expired AS (
    SELECT ctid
    FROM public.cache_entries
    WHERE expires_at <= now()
    ORDER BY expires_at ASC
    LIMIT max_rows
  ),
  deleted AS (
    DELETE FROM public.cache_entries ce
    USING expired
    WHERE ce.ctid = expired.ctid
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count
  FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ------------------------------
-- Rate limiting (atomic in DB)
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  window_interval interval := make_interval(secs => p_window_seconds);
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, now_ts, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    window_start = CASE
      WHEN public.rate_limits.window_start <= now_ts - window_interval THEN now_ts
      ELSE public.rate_limits.window_start
    END,
    count = CASE
      WHEN public.rate_limits.window_start <= now_ts - window_interval THEN 1
      ELSE public.rate_limits.count + 1
    END;

  RETURN QUERY
  SELECT
    (rl.count <= p_limit) AS allowed,
    GREATEST(p_limit - rl.count, 0) AS remaining,
    (rl.window_start + window_interval) AS reset_at
  FROM public.rate_limits rl
  WHERE rl.key = p_key;
END;
$$;

-- Cleanup helper (optional)
CREATE OR REPLACE FUNCTION public.rate_limit_cleanup(
  max_rows integer DEFAULT 1000,
  older_than_seconds integer DEFAULT 86400
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  cutoff timestamptz := now() - make_interval(secs => older_than_seconds);
BEGIN
  WITH stale AS (
    SELECT ctid
    FROM public.rate_limits
    WHERE window_start <= cutoff
    ORDER BY window_start ASC
    LIMIT max_rows
  ),
  deleted AS (
    DELETE FROM public.rate_limits rl
    USING stale
    WHERE rl.ctid = stale.ctid
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count
  FROM deleted;

  RETURN deleted_count;
END;
$$;

-- ------------------------------
-- Background jobs (Postgres queue)
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_status_check CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'retry'))
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_at ON public.jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_locked_at ON public.jobs(locked_at);
CREATE INDEX IF NOT EXISTS idx_jobs_task ON public.jobs(task);

-- Claim jobs atomically (worker uses this)
CREATE OR REPLACE FUNCTION public.claim_jobs(
  p_worker_id text,
  p_max_jobs integer DEFAULT 10,
  p_lock_timeout_seconds integer DEFAULT 300
)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_timeout interval := make_interval(secs => p_lock_timeout_seconds);
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.jobs j
    WHERE j.status IN ('queued', 'retry')
      AND j.run_at <= now()
      AND (j.locked_at IS NULL OR j.locked_at <= now() - lock_timeout)
    ORDER BY j.run_at ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_max_jobs
  )
  UPDATE public.jobs j
  SET
    status = 'processing',
    locked_by = p_worker_id,
    locked_at = now(),
    updated_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;
