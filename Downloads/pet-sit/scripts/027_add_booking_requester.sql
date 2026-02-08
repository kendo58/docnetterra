-- Track who initiated a booking request.
-- Safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES public.profiles(id);

UPDATE public.bookings
SET requested_by = sitter_id
WHERE requested_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_requested_by ON public.bookings(requested_by);
