-- Prevent users from booking their own listings.
-- Safe to run multiple times.

DROP POLICY IF EXISTS "Users can manage own bookings" ON public.bookings;

CREATE POLICY "Users can manage own bookings"
  ON public.bookings
  FOR ALL
  USING (
    auth.uid() = sitter_id
    OR EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = bookings.listing_id
        AND listings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (
      auth.uid() = sitter_id
      OR EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id = bookings.listing_id
          AND listings.user_id = auth.uid()
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = bookings.listing_id
        AND listings.user_id = bookings.sitter_id
    )
  );
