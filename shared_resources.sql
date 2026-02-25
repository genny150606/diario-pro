-- ============================================
-- STEP 1: Create shared_resources table + RLS
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('note', 'flashcard')),
    resource_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'saved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_resources ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT only if sender_id matches auth user
CREATE POLICY "Users can send resources"
    ON shared_resources FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Policy: SELECT for sender or receiver
CREATE POLICY "Users can view their shared resources"
    ON shared_resources FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: UPDATE only for receiver (to accept/reject)
CREATE POLICY "Receiver can update status"
    ON shared_resources FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);
