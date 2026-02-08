-- Add listing_type and house swap fields to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'pet_sitting',
ADD COLUMN IF NOT EXISTS swap_start_date DATE,
ADD COLUMN IF NOT EXISTS swap_end_date DATE,
ADD COLUMN IF NOT EXISTS desired_swap_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS desired_swap_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS desired_swap_country VARCHAR(100) DEFAULT 'US';

-- Add comment for documentation
COMMENT ON COLUMN listings.listing_type IS 'Type of listing: pet_sitting, house_swap';
COMMENT ON COLUMN listings.swap_start_date IS 'Start date for house swap availability';
COMMENT ON COLUMN listings.swap_end_date IS 'End date for house swap availability';
COMMENT ON COLUMN listings.desired_swap_city IS 'Desired city for house swap';
COMMENT ON COLUMN listings.desired_swap_state IS 'Desired state for house swap';
