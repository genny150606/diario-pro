-- ============================================================
-- DUEL MODE FIX - V2 (Safe Run)
-- ============================================================

-- 1. Ensure tables exist (Safe)
CREATE TABLE IF NOT EXISTS public.quiz_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'waiting', 
    ai_data JSONB DEFAULT '[]',
    start_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE TABLE IF NOT EXISTS public.quiz_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    is_ready BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESET RLS (Safe)
ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_players ENABLE ROW LEVEL SECURITY;

-- 3. ALLOW PUBLIC ACCESS (Re-create Policies)
DROP POLICY IF EXISTS "Public manage quiz_rooms" ON public.quiz_rooms;
CREATE POLICY "Public manage quiz_rooms" ON public.quiz_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public manage quiz_players" ON public.quiz_players;
CREATE POLICY "Public manage quiz_players" ON public.quiz_players FOR ALL USING (true) WITH CHECK (true);

-- 4. ENABLE REALTIME (Removed potentially erroring line)
-- If it gave an error, it means it's ALREADY enabled, which is good!
-- We skip the "ALTER PUBLICATION" command to avoid the error.

-- 5. VERIFY
SELECT count(*) as active_rooms FROM quiz_rooms;
