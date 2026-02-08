-- Add listing_type and related columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type character varying DEFAULT 'pet_sitting';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS help_needed character varying DEFAULT 'pet_sitting';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stay_start_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stay_end_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS desired_stay_city character varying;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS desired_stay_state character varying;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stay_offer_type character varying;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stay_offer_description text;
