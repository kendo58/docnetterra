-- Add services_offered column to listings for stay seekers
-- This stores what services a stay seeker can offer (pet_sitting, gardening, cleaning, etc.)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS services_offered jsonb DEFAULT '[]'::jsonb;

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_listings_services_offered ON listings USING GIN (services_offered);

-- Comment for documentation
COMMENT ON COLUMN listings.services_offered IS 'Array of services the stay seeker can offer: pet_sitting, gardening, cleaning, cooking, handyman, childcare, etc.';
