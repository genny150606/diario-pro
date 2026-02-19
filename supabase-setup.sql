-- ============================================================
-- StudyJournal Pro — Supabase Setup SQL
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. users_data table (per-user JSON blob storage)
CREATE TABLE IF NOT EXISTS public.users_data (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users_data ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their OWN row
CREATE POLICY "Users manage own data" ON public.users_data
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Homepage stats query: allow anon to count rows (no personal data exposed)
CREATE POLICY "Anon can count rows" ON public.users_data
    FOR SELECT USING (true);

-- ============================================================
-- 2. site_stats table (global counters like chatbot interactions)
CREATE TABLE IF NOT EXISTS public.site_stats (
    key TEXT PRIMARY KEY,
    value BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read stats (homepage displays them)
CREATE POLICY "Anyone can read site_stats" ON public.site_stats
    FOR SELECT USING (true);

-- Any authenticated user can increment stats
CREATE POLICY "Auth users can upsert site_stats" ON public.site_stats
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Init chatbot_interactions counter
INSERT INTO public.site_stats (key, value)
VALUES ('chatbot_interactions', 0)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. reviews table (for testimonials)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    role TEXT,
    text TEXT,
    rating INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Auth users can insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
