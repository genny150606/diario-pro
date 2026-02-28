-- ============================================
-- StudyJournal Pro: Stanze di Studio Virtuali
-- Tabelle, RLS e Realtime
-- ============================================

-- 1. Tabella study_rooms
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pomodoro_status TEXT NOT NULL DEFAULT 'idle' CHECK (pomodoro_status IN ('idle', 'focus', 'break')),
    time_remaining INTEGER NOT NULL DEFAULT 1500, -- 25 minuti in secondi
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_participants INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabella study_participants
CREATE TABLE IF NOT EXISTS public.study_participants (
    room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Abilita RLS
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_participants ENABLE ROW LEVEL SECURITY;

-- study_rooms: tutti gli utenti autenticati possono leggere
CREATE POLICY "study_rooms_select_authenticated"
    ON public.study_rooms FOR SELECT
    TO authenticated
    USING (true);

-- study_rooms: qualsiasi utente autenticato può creare una stanza
CREATE POLICY "study_rooms_insert_authenticated"
    ON public.study_rooms FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = creator_id);

-- study_rooms: solo il creatore può aggiornare la propria stanza (es. timer pomodoro)
CREATE POLICY "study_rooms_update_creator"
    ON public.study_rooms FOR UPDATE
    TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- study_rooms: solo il creatore può eliminare la propria stanza
CREATE POLICY "study_rooms_delete_creator"
    ON public.study_rooms FOR DELETE
    TO authenticated
    USING (auth.uid() = creator_id);

-- study_participants: tutti gli utenti autenticati possono leggere i partecipanti
CREATE POLICY "study_participants_select_authenticated"
    ON public.study_participants FOR SELECT
    TO authenticated
    USING (true);

-- study_participants: un utente può inserire solo la propria partecipazione
CREATE POLICY "study_participants_insert_self"
    ON public.study_participants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- study_participants: un utente può aggiornare solo il proprio stato (es. mute)
CREATE POLICY "study_participants_update_self"
    ON public.study_participants FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- study_participants: un utente può rimuovere solo la propria partecipazione
CREATE POLICY "study_participants_delete_self"
    ON public.study_participants FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- Supabase Realtime
-- ============================================

-- Abilita Realtime per entrambe le tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_participants;

-- ============================================
-- Indici per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_study_rooms_creator ON public.study_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_participants_room ON public.study_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_study_participants_user ON public.study_participants(user_id);
