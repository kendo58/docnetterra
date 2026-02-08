-- Add stay-specific fields to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS stay_start_date DATE,
ADD COLUMN IF NOT EXISTS stay_end_date DATE,
ADD COLUMN IF NOT EXISTS desired_stay_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS desired_stay_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS stay_offer_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS stay_offer_description TEXT;

-- Update listing_type comment to include stay
COMMENT ON COLUMN listings.listing_type IS 'Type of listing: pet_sitting, house_swap, stay';
COMMENT ON COLUMN listings.stay_start_date IS 'Start date for desired stay';
COMMENT ON COLUMN listings.stay_end_date IS 'End date for desired stay';
COMMENT ON COLUMN listings.desired_stay_city IS 'City where user wants to stay';
COMMENT ON COLUMN listings.desired_stay_state IS 'State where user wants to stay';
COMMENT ON COLUMN listings.stay_offer_type IS 'What user offers in exchange: pet_sitting, chores, both';
COMMENT ON COLUMN listings.stay_offer_description IS 'Description of what user is willing to offer';
