-- ============================================================
-- SOCIAL FEATURES SETUP
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ensure username column exists in users_data
ALTER TABLE public.users_data ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- 3. duel_invitations table
CREATE TABLE IF NOT EXISTS public.duel_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    host_name TEXT,
    guest_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    room_code TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for friendships
DROP POLICY IF EXISTS "Users view own friendships" ON public.friendships;
CREATE POLICY "Users view own friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users manage own friendships" ON public.friendships;
CREATE POLICY "Users manage own friendships" ON public.friendships
    FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policies for invitations
DROP POLICY IF EXISTS "Users view own invitations" ON public.duel_invitations;
CREATE POLICY "Users view own invitations" ON public.duel_invitations
    FOR SELECT USING (auth.uid() = guest_id OR auth.uid() = host_id);

DROP POLICY IF EXISTS "Users manage own invitations" ON public.duel_invitations;
CREATE POLICY "Users manage own invitations" ON public.duel_invitations
    FOR ALL USING (auth.uid() = guest_id OR auth.uid() = host_id);

-- Policy to allow authenticated users to search others by username
DROP POLICY IF EXISTS "Auth users can search usernames" ON public.users_data;
CREATE POLICY "Auth users can search usernames" ON public.users_data
    FOR SELECT USING (auth.uid() IS NOT NULL);
