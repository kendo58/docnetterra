-- Add pricing columns to sitter_profiles
ALTER TABLE public.sitter_profiles
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS pricing_notes TEXT;

-- Add pricing columns to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS suggested_compensation NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS compensation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS additional_perks JSONB;

-- Create price history table for tracking changes
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  sitter_id UUID REFERENCES public.profiles(id),
  price_type VARCHAR(50),
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price history"
  ON public.price_history FOR SELECT
  USING (auth.uid() = sitter_id OR 
         EXISTS (
           SELECT 1 FROM public.listings 
           WHERE listings.id = price_history.listing_id 
           AND listings.user_id = auth.uid()
         ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sitter_profiles_hourly_rate ON public.sitter_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_listings_suggested_compensation ON public.listings(suggested_compensation);
CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON public.price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_sitter_id ON public.price_history(sitter_id);
