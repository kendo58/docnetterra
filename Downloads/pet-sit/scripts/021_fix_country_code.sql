-- Fix country column to allow longer values or update to proper ISO codes
-- First, alter the column to allow longer country codes if needed
ALTER TABLE addresses 
  ALTER COLUMN country TYPE character varying(3);

-- Update any existing "US" entries to "USA" for consistency (or vice versa)
-- Using USA as the standard since that's what the app uses
UPDATE addresses SET country = 'USA' WHERE country = 'US';
