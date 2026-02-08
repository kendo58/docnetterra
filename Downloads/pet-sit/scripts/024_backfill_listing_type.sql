-- Ensure `listings.listing_type` exists and is populated for older projects.
-- This is safe to run multiple times.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_type character varying DEFAULT 'pet_sitting';

-- Backfill based on legacy `property_type` sentinel.
UPDATE public.listings
SET listing_type = 'stay'
WHERE property_type = 'looking_for_stay'
  AND listing_type IS DISTINCT FROM 'stay';

UPDATE public.listings
SET listing_type = 'pet_sitting'
WHERE (property_type IS NULL OR property_type <> 'looking_for_stay')
  AND (listing_type IS NULL OR listing_type NOT IN ('pet_sitting', 'stay', 'house_swap'));

-- Helpful index for common filters.
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON public.listings(listing_type);

