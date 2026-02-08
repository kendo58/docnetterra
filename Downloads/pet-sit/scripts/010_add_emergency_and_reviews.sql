-- Add emergency information to pets table
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS vet_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS vet_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS vet_address TEXT,
ADD COLUMN IF NOT EXISTS medication_schedule JSONB,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS special_needs TEXT;

-- Enhanced reviews with photos
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS photos JSONB,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE;

-- Create review helpfulness tracking
CREATE TABLE IF NOT EXISTS public.review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view helpfulness"
  ON public.review_helpfulness FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can manage own helpfulness"
  ON public.review_helpfulness FOR ALL
  USING (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

-- Create recurring bookings table
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week INTEGER,
  time_of_day TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring bookings"
  ON public.recurring_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = recurring_bookings.parent_booking_id 
      AND (bookings.sitter_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM public.listings 
             WHERE listings.id = bookings.listing_id 
             AND listings.user_id = auth.uid()
           ))
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_parent ON public.recurring_bookings(parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON public.review_helpfulness(review_id);
