-- Add RLS policy for users to view their own listings (active or inactive)
DROP POLICY IF EXISTS "Users can view own listings" ON listings;
CREATE POLICY "Users can view own listings" ON listings
  FOR SELECT USING (user_id = auth.uid());

-- Update addresses RLS to allow viewing addresses for listings you can see
DROP POLICY IF EXISTS "Users can view addresses for accessible listings" ON addresses;
CREATE POLICY "Users can view addresses for accessible listings" ON addresses
  FOR SELECT USING (
    user_id = auth.uid() OR 
    id IN (SELECT address_id FROM listings WHERE user_id = auth.uid())
  );
