-- Add support for direct messaging without requiring matches
-- Add columns to conversations table to support direct messaging

-- Add participant columns for direct messaging
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS participant1_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS participant2_id UUID REFERENCES public.profiles(id);

-- Drop the unique constraint on match_id since we now support both match-based and direct conversations
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_match_id_key;

-- Make match_id nullable
ALTER TABLE public.conversations
ALTER COLUMN match_id DROP NOT NULL;

-- Add index for direct messaging lookups
CREATE INDEX IF NOT EXISTS idx_conversations_participants 
  ON public.conversations(listing_id, participant1_id, participant2_id);

-- Update RLS policies to support direct messaging

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;

-- New policy for viewing conversations (supports both match-based and direct)
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    -- Match-based conversations
    (match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = conversations.match_id 
      AND (
        matches.sitter_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.listings 
          WHERE listings.id = matches.listing_id 
          AND listings.user_id = auth.uid()
        )
      )
    ))
    OR
    -- Direct conversations
    (listing_id IS NOT NULL AND (
      auth.uid() = participant1_id OR 
      auth.uid() = participant2_id
    ))
  );

-- New policy for creating conversations (supports both match-based and direct)
CREATE POLICY "Users can create own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    -- Match-based conversations
    (match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = conversations.match_id 
      AND (
        matches.sitter_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.listings 
          WHERE listings.id = matches.listing_id 
          AND listings.user_id = auth.uid()
        )
      )
    ))
    OR
    -- Direct conversations (user must be one of the participants)
    (listing_id IS NOT NULL AND auth.uid() = participant1_id)
  );
