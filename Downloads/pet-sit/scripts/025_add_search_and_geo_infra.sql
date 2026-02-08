-- Search & Geo Infrastructure (Performance)
-- Adds full-text search, helpful indexes, and optional PostGIS helpers.
-- Safe to run multiple times.

-- PostGIS enables future radius/nearby search with proper spatial indexes.
-- Supabase supports CREATE EXTENSION in the SQL editor.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a generated geography point for addresses to support fast distance queries.
-- Uses (longitude, latitude) in SRID 4326.
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NULL OR longitude IS NULL THEN NULL
      ELSE ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_addresses_location_gist ON public.addresses USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_addresses_city_state ON public.addresses(city, state);
CREATE INDEX IF NOT EXISTS idx_addresses_state ON public.addresses(state);

-- Listings: full-text search document (title + description)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS search_document tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_search_document ON public.listings USING GIN (search_document);

-- Common listing filters
CREATE INDEX IF NOT EXISTS idx_listings_active_created_at ON public.listings(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_address_id ON public.listings(address_id);
CREATE INDEX IF NOT EXISTS idx_listings_listing_type_active ON public.listings(listing_type, is_active);

-- Relationship filters
CREATE INDEX IF NOT EXISTS idx_pets_species_listing_id ON public.pets(species, listing_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type_listing_id ON public.tasks(task_type, listing_id);

-- Availability range filtering (unbooked only)
CREATE INDEX IF NOT EXISTS idx_availability_unbooked_range
  ON public.availability(listing_id, start_date, end_date)
  WHERE is_booked = false;

