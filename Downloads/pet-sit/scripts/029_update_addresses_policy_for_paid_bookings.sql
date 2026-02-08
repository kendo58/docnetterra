-- Allow sitters to view listing addresses after payment is completed.
-- Safe to run multiple times.

DROP POLICY IF EXISTS "Users can view addresses for accessible listings" ON addresses;
CREATE POLICY "Users can view addresses for accessible listings" ON addresses
  FOR SELECT USING (
    user_id = auth.uid()
    OR id IN (SELECT address_id FROM listings WHERE user_id = auth.uid())
    OR id IN (
      SELECT l.address_id
      FROM public.bookings b
      JOIN public.listings l ON l.id = b.listing_id
      WHERE b.sitter_id = auth.uid()
        AND b.payment_status = 'paid'
    )
  );
