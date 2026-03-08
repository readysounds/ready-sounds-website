-- ============================================================
-- Ready Sounds — Downloads Table Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CREATE DOWNLOADS TABLE
CREATE TABLE IF NOT EXISTS public.downloads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id         INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
  track_title      TEXT NOT NULL,
  track_artist     TEXT NOT NULL,
  version_title    TEXT NOT NULL DEFAULT 'Full Track',
  file_format      TEXT NOT NULL DEFAULT 'MP3',
  subscription_plan TEXT,
  license_id       TEXT UNIQUE NOT NULL,
  downloaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Users can only read their own downloads
CREATE POLICY "Users can view own downloads"
  ON public.downloads FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own download records
CREATE POLICY "Authenticated users can insert downloads"
  ON public.downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. GRANT ACCESS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.downloads TO authenticated;

-- ============================================================
-- Verify with:
-- SELECT * FROM downloads ORDER BY downloaded_at DESC;
-- ============================================================
