-- Hot-path query indexes for webhook/payment/admin performance.
-- Safe to run multiple times.

-- Webhook finalize and payment status reconciliation.
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent_id
  ON public.bookings(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Common sitter dashboard filters.
CREATE INDEX IF NOT EXISTS idx_bookings_sitter_status_payment
  ON public.bookings(sitter_id, status, payment_status, created_at DESC);

-- Homeowner/listing level booking lookups and overlap checks.
CREATE INDEX IF NOT EXISTS idx_bookings_listing_status_dates
  ON public.bookings(listing_id, status, start_date, end_date);

-- Faster ledger scans for per-user points totals and refund paths.
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_reason_created_at
  ON public.points_ledger(user_id, reason, created_at DESC);

-- Safety report triage queue ordering.
CREATE INDEX IF NOT EXISTS idx_safety_reports_status_created_at
  ON public.safety_reports(status, created_at DESC);

