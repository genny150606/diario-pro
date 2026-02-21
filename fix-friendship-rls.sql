-- ============================================================
-- FIX RLS POLICIES FOR FRIENDSHIPS
-- Run this in Supabase Dashboard → SQL Editor
-- This ensures users can send, view, and manage their own friendships
-- ============================================================

-- 1. Enable RLS (Just in case)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 2. Clear existing restrictive policies
DROP POLICY IF EXISTS "Users manage own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users view own friendships" ON public.friendships;

-- 3. Create granular policies
-- SELECT: Users can see friendships where they are either sender or receiver
CREATE POLICY "Select own friendships" 
ON public.friendships FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: Users can only send requests WHERE THEY ARE THE SENDER
CREATE POLICY "Insert own friendships" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Users can update friendships they are part of (e.g., accepting or blocking)
CREATE POLICY "Update own friendships" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- DELETE: Users can delete/cancel their own friendships
CREATE POLICY "Delete own friendships" 
ON public.friendships FOR DELETE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4. Verify users_data search policy (ensure it's active for search)
DROP POLICY IF EXISTS "Auth users can search usernames" ON public.users_data;
CREATE POLICY "Auth users can search usernames" 
ON public.users_data FOR SELECT 
USING (auth.uid() IS NOT NULL);
