-- ============================================================
-- FIX FOREIGN KEY RELATIONSHIPS FOR SOCIAL FEATURES
-- Run this in Supabase Dashboard → SQL Editor
-- This will allow joining friendships with user profiles
-- ============================================================

-- 1. Fix Friendships Table
ALTER TABLE public.friendships 
  DROP CONSTRAINT IF EXISTS friendships_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS friendships_receiver_id_fkey;

ALTER TABLE public.friendships 
  ADD CONSTRAINT friendships_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users_data(id) ON DELETE CASCADE,
  ADD CONSTRAINT friendships_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users_data(id) ON DELETE CASCADE;

-- 2. Fix Duel Invitations Table
ALTER TABLE public.duel_invitations 
  DROP CONSTRAINT IF EXISTS duel_invitations_host_id_fkey,
  DROP CONSTRAINT IF EXISTS duel_invitations_guest_id_fkey;

ALTER TABLE public.duel_invitations 
  ADD CONSTRAINT duel_invitations_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.users_data(id) ON DELETE CASCADE,
  ADD CONSTRAINT duel_invitations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.users_data(id) ON DELETE CASCADE;

-- 3. Verify RLS (Good measure)
ALTER TABLE public.users_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users can search usernames" ON public.users_data;
CREATE POLICY "Auth users can search usernames" ON public.users_data
    FOR SELECT USING (auth.uid() IS NOT NULL);
