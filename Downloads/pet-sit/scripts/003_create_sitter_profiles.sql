-- Sitter Profiles
CREATE TABLE IF NOT EXISTS public.sitter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  experience_years INTEGER,
  pet_experience JSONB,
  skills JSONB,
  languages JSONB,
  smoking BOOLEAN,
  about_me TEXT,
  why_sitting TEXT,
  photos JSONB,
  certifications JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sitter_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sitter profiles
CREATE POLICY "Anyone can view active sitter profiles"
  ON public.sitter_profiles FOR SELECT
  USING (is_active = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own sitter profile"
  ON public.sitter_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sitter profile"
  ON public.sitter_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sitter profile"
  ON public.sitter_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- References table
CREATE TABLE IF NOT EXISTS public.references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_name VARCHAR(255) NOT NULL,
  referee_email VARCHAR(255),
  referee_phone VARCHAR(20),
  relationship VARCHAR(100),
  reference_text TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitters can view own references"
  ON public.references FOR SELECT
  USING (auth.uid() = sitter_id);

CREATE POLICY "Sitters can insert own references"
  ON public.references FOR INSERT
  WITH CHECK (auth.uid() = sitter_id);

CREATE POLICY "Sitters can update own references"
  ON public.references FOR UPDATE
  USING (auth.uid() = sitter_id);

-- Indexes
CREATE INDEX idx_sitter_profiles_user_id ON public.sitter_profiles(user_id);
CREATE INDEX idx_sitter_profiles_is_active ON public.sitter_profiles(is_active);
CREATE INDEX idx_references_sitter_id ON public.references(sitter_id);

-- Update trigger
CREATE TRIGGER update_sitter_profiles_updated_at
  BEFORE UPDATE ON public.sitter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
