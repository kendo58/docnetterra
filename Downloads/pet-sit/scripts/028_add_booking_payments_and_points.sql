-- Booking payments + points system
-- Safe to run multiple times.

-- Booking fee fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_fee_per_night numeric(10,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cleaning_fee numeric(10,2) DEFAULT 200,
  ADD COLUMN IF NOT EXISTS service_fee_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS points_applied integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_due numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_status varchar(20) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method varchar(20),
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS points_awarded integer DEFAULT 0;

-- Backfill totals for existing bookings
UPDATE public.bookings
SET
  service_fee_per_night = COALESCE(service_fee_per_night, 50),
  cleaning_fee = COALESCE(cleaning_fee, 200),
  service_fee_total = COALESCE(service_fee_total, GREATEST((end_date - start_date), 1) * COALESCE(service_fee_per_night, 50)),
  total_fee = COALESCE(total_fee, COALESCE(service_fee_total, GREATEST((end_date - start_date), 1) * COALESCE(service_fee_per_night, 50)) + COALESCE(cleaning_fee, 200) + COALESCE(insurance_cost, 0)),
  cash_due = COALESCE(cash_due, COALESCE(total_fee, COALESCE(service_fee_total, GREATEST((end_date - start_date), 1) * COALESCE(service_fee_per_night, 50)) + COALESCE(cleaning_fee, 200) + COALESCE(insurance_cost, 0))),
  payment_status = COALESCE(payment_status, 'unpaid')
WHERE service_fee_total IS NULL
   OR total_fee IS NULL
   OR cash_due IS NULL
   OR payment_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Points ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  points_delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points ledger"
  ON public.points_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger(user_id, created_at DESC);
