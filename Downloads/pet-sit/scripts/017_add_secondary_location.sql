-- Add secondary location columns for stay seekers
ALTER TABLE listings ADD COLUMN IF NOT EXISTS secondary_city text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS secondary_state text;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_listings_secondary_city ON listings(secondary_city);
CREATE INDEX IF NOT EXISTS idx_listings_secondary_state ON listings(secondary_state);
