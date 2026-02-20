-- FIX MISSING COLUMNS
-- Run this if "order by created_at" fails

ALTER TABLE public.quiz_players 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.quiz_players 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify
SELECT * FROM public.quiz_players LIMIT 1;
