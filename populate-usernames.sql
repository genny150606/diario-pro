-- ============================================================
-- POPULATE MISSING USERNAMES
-- Run this in Supabase Dashboard → SQL Editor
-- This script ensures all existing users are searchable by username
-- ============================================================

-- 1. Ensure all users from auth.users have a row in public.users_data
INSERT INTO public.users_data (id, username, updated_at)
SELECT 
    id, 
    COALESCE(
        split_part(email, '@', 1), -- Use the part before @ as default username
        'user_' || substr(id::text, 1, 8) -- Fallback to partial ID if email is missing
    ),
    NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET username = EXCLUDED.username 
WHERE users_data.username IS NULL;

-- 2. Clean up any weird usernames (optional)
-- UPDATE public.users_data SET username = LOWER(username);

-- 3. Verify
SELECT id, username FROM public.users_data LIMIT 10;
