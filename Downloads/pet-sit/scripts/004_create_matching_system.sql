-- Matches (Swipe data)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  sitter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  homeowner_swipe VARCHAR(20),
  sitter_swipe VARCHAR(20),
  is_match BOOLEAN DEFAULT FALSE,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, sitter_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches they're involved in
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (
    auth.uid() = sitter_id OR 
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = matches.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Users can create/update matches they're involved in
CREATE POLICY "Users can manage own matches"
  ON public.matches FOR ALL
  USING (
    auth.uid() = sitter_id OR 
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = matches.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id),
  sitter_id UUID REFERENCES public.profiles(id),
  match_id UUID REFERENCES public.matches(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  insurance_selected BOOLEAN DEFAULT FALSE,
  insurance_plan_type VARCHAR(50),
  insurance_cost DECIMAL(10,2),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users can view bookings they're involved in
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = sitter_id OR 
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = bookings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Users can manage bookings they're involved in
CREATE POLICY "Users can manage own bookings"
  ON public.bookings FOR ALL
  USING (
    auth.uid() = sitter_id OR 
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = bookings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_matches_listing_sitter ON public.matches(listing_id, sitter_id);
CREATE INDEX idx_matches_is_match ON public.matches(is_match);
CREATE INDEX idx_bookings_sitter_id ON public.bookings(sitter_id);
CREATE INDEX idx_bookings_listing_id ON public.bookings(listing_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);

-- Update trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
