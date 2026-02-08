-- Listings (Homeowner posts)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.addresses(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  property_type VARCHAR(50),
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  amenities JSONB,
  house_rules TEXT,
  photos JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active listings"
  ON public.listings FOR SELECT
  USING (is_active = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = user_id);

-- Pets table
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50),
  breed VARCHAR(100),
  age INTEGER,
  weight DECIMAL(5,2),
  temperament TEXT,
  medical_conditions TEXT,
  dietary_requirements TEXT,
  care_instructions TEXT,
  photos JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Anyone can view pets for active listings
CREATE POLICY "Anyone can view pets for listings"
  ON public.pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = pets.listing_id 
      AND (listings.is_active = TRUE OR listings.user_id = auth.uid())
    )
  );

CREATE POLICY "Listing owners can manage pets"
  ON public.pets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = pets.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Tasks/Chores table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  task_type VARCHAR(50),
  description TEXT NOT NULL,
  frequency VARCHAR(50),
  estimated_hours_per_week DECIMAL(4,2),
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks for listings"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = tasks.listing_id 
      AND (listings.is_active = TRUE OR listings.user_id = auth.uid())
    )
  );

CREATE POLICY "Listing owners can manage tasks"
  ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = tasks.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Availability periods
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability"
  ON public.availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = availability.listing_id 
      AND (listings.is_active = TRUE OR listings.user_id = auth.uid())
    )
  );

CREATE POLICY "Listing owners can manage availability"
  ON public.availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = availability.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_is_active ON public.listings(is_active);
CREATE INDEX idx_pets_listing_id ON public.pets(listing_id);
CREATE INDEX idx_tasks_listing_id ON public.tasks(listing_id);
CREATE INDEX idx_availability_listing_id ON public.availability(listing_id);
CREATE INDEX idx_availability_dates ON public.availability(start_date, end_date);

-- Update trigger for listings
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
