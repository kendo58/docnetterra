-- Atomic booking payment + points debit with per-sitter transactional locking.
-- Safe to run multiple times.

CREATE OR REPLACE FUNCTION public.pay_booking_with_points(
  p_booking_id uuid,
  p_sitter_id uuid,
  p_requested_points integer,
  p_service_fee_per_night numeric,
  p_cleaning_fee numeric,
  p_service_fee_total numeric,
  p_total_fee numeric,
  p_paid_at timestamptz,
  p_cash_paid numeric
)
RETURNS TABLE (
  updated boolean,
  already_paid boolean,
  points_applied integer,
  cash_due numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_balance integer := 0;
  v_requested_points integer := GREATEST(COALESCE(p_requested_points, 0), 0);
  v_nights integer := 1;
  v_points_to_apply integer := 0;
  v_cash_due numeric := 0;
  v_cash_paid numeric := GREATEST(COALESCE(p_cash_paid, 0), 0);
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND sitter_id = p_sitter_id
    AND status IN ('confirmed', 'accepted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, 0::numeric;
    RETURN;
  END IF;

  IF COALESCE(v_booking.payment_status, 'unpaid') = 'paid' THEN
    RETURN QUERY SELECT false, true, COALESCE(v_booking.points_applied, 0), COALESCE(v_booking.cash_due, 0);
    RETURN;
  END IF;

  v_nights := GREATEST((v_booking.end_date - v_booking.start_date), 1);

  -- Serialize points spending per sitter across concurrent transactions.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_booking.sitter_id::text, 0));

  SELECT GREATEST(COALESCE(SUM(points_delta), 0), 0)::integer
  INTO v_balance
  FROM public.points_ledger
  WHERE user_id = v_booking.sitter_id;

  v_points_to_apply := LEAST(v_requested_points, v_nights, v_balance);
  v_cash_due := GREATEST(p_total_fee - (v_points_to_apply * p_service_fee_per_night), 0);

  IF v_cash_paid + 0.000001 < v_cash_due THEN
    RETURN QUERY SELECT false, false, 0, v_cash_due;
    RETURN;
  END IF;

  IF v_points_to_apply > 0 THEN
    INSERT INTO public.points_ledger (user_id, booking_id, points_delta, reason)
    VALUES (v_booking.sitter_id, v_booking.id, -ABS(v_points_to_apply), 'booking_payment_points');
  END IF;

  UPDATE public.bookings
  SET
    service_fee_per_night = p_service_fee_per_night,
    cleaning_fee = p_cleaning_fee,
    service_fee_total = p_service_fee_total,
    total_fee = p_total_fee,
    points_applied = v_points_to_apply,
    cash_due = v_cash_due,
    payment_status = 'paid',
    paid_at = p_paid_at,
    payment_method = 'dummy'
  WHERE id = v_booking.id;

  RETURN QUERY SELECT true, false, v_points_to_apply, v_cash_due;
END;
$$;
