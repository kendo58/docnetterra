-- Add search_radius column to listings table for radius-based matching
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_radius integer DEFAULT 25;

-- Add comment explaining the column
COMMENT ON COLUMN listings.search_radius IS 'Search radius in miles for stay listings';

-- Update any null values to default
UPDATE listings SET search_radius = 25 WHERE search_radius IS NULL;
