-- Add help_needed column to listings for Find a Sitter type
-- This tracks whether homeowners need pet sitting, chores, or both
ALTER TABLE listings ADD COLUMN IF NOT EXISTS help_needed TEXT DEFAULT 'pet_sitting';

-- Add a comment for clarity
COMMENT ON COLUMN listings.help_needed IS 'What help the homeowner needs: pet_sitting, chores, or both';
