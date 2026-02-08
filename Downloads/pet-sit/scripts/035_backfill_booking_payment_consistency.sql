-- Backfill and normalize booking payment metadata for legacy rows.
-- Safe to run multiple times.

BEGIN;

-- Normalize base defaults and prevent negative point counters.
UPDATE public.bookings
SET
  service_fee_per_night = COALESCE(service_fee_per_night, 50),
  cleaning_fee = COALESCE(cleaning_fee, 200),
  points_applied = GREATEST(COALESCE(points_applied, 0), 0),
  points_awarded = GREATEST(COALESCE(points_awarded, 0), 0)
WHERE service_fee_per_night IS NULL
   OR cleaning_fee IS NULL
   OR points_applied IS NULL
   OR points_applied < 0
   OR points_awarded IS NULL
   OR points_awarded < 0;

-- Clamp points applied to valid stay nights so derived cash_due stays sane.
UPDATE public.bookings
SET points_applied = LEAST(
  GREATEST(COALESCE(points_applied, 0), 0),
  GREATEST((end_date - start_date), 1)
)
WHERE COALESCE(points_applied, 0) > GREATEST((end_date - start_date), 1)
   OR points_applied IS NULL
   OR points_applied < 0;

-- Recompute derived fee totals where legacy data is null/invalid.
WITH normalized AS (
  SELECT
    id,
    COALESCE(service_fee_per_night, 50) AS nightly_fee,
    COALESCE(cleaning_fee, 200) AS cleaning_fee,
    COALESCE(insurance_cost, 0) AS insurance_cost,
    GREATEST((end_date - start_date), 1)::numeric AS nights,
    LEAST(GREATEST(COALESCE(points_applied, 0), 0), GREATEST((end_date - start_date), 1))::numeric AS points_applied_clamped
  FROM public.bookings
)
UPDATE public.bookings b
SET
  service_fee_total = (n.nights * n.nightly_fee),
  total_fee = (n.nights * n.nightly_fee) + n.cleaning_fee + n.insurance_cost,
  cash_due = GREATEST(((n.nights * n.nightly_fee) + n.cleaning_fee + n.insurance_cost) - (n.points_applied_clamped * n.nightly_fee), 0)
FROM normalized n
WHERE b.id = n.id
  AND (
    b.service_fee_total IS NULL
    OR b.total_fee IS NULL
    OR b.cash_due IS NULL
    OR b.service_fee_total < 0
    OR b.total_fee < 0
    OR b.cash_due < 0
  );

-- Ensure paid bookings always have a paid timestamp.
UPDATE public.bookings
SET paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE payment_status = 'paid'
  AND paid_at IS NULL;

-- Normalize payment status from timestamps.
UPDATE public.bookings
SET payment_status = 'refunded'
WHERE refunded_at IS NOT NULL
  AND payment_status IS DISTINCT FROM 'refunded';

UPDATE public.bookings
SET payment_status = 'paid'
WHERE refunded_at IS NULL
  AND paid_at IS NOT NULL
  AND payment_status IS DISTINCT FROM 'paid';

UPDATE public.bookings
SET payment_status = 'unpaid'
WHERE payment_status IS NULL
   OR payment_status NOT IN ('unpaid', 'paid', 'refunded');

-- Backfill payment method for rows that are paid/refunded but missing method.
UPDATE public.bookings
SET payment_method = CASE
  WHEN stripe_payment_intent_id IS NOT NULL THEN 'stripe'
  ELSE 'dummy'
END
WHERE payment_status IN ('paid', 'refunded')
  AND (payment_method IS NULL OR btrim(payment_method) = '');

COMMIT;
