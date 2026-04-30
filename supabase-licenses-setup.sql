-- ============================================================
-- Ready Sounds — Licenses Table Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CREATE LICENSES TABLE
CREATE TABLE IF NOT EXISTS public.licenses (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id          INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
  license_type      TEXT NOT NULL CHECK (license_type IN ('individual', 'business')),
  stripe_session_id TEXT NOT NULL,
  purchased_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Users can only read their own licenses
CREATE POLICY "Users can view own licenses"
  ON public.licenses FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert licenses (webhook uses service role key)
CREATE POLICY "Service role can insert licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (true);

-- 3. GRANT ACCESS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.licenses TO authenticated;

-- ============================================================
-- Verify with:
-- SELECT * FROM licenses ORDER BY purchased_at DESC;
-- ============================================================
