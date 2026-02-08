-- Add onboarding_completed field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add response_time tracking for quick responder badge
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avg_response_time_hours INTEGER;
