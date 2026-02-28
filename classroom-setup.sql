-- ============================================
-- StudyJournal Pro: Classroom
-- Tabelle, RLS e Realtime
-- ============================================

-- 1. Tabella classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabella classroom_members
CREATE TABLE IF NOT EXISTS public.classroom_members (
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (classroom_id, user_id)
);

-- 3. Tabella classroom_shared_resources
CREATE TABLE IF NOT EXISTS public.classroom_shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('note', 'flashcards')),
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_shared_resources ENABLE ROW LEVEL SECURITY;

-- classrooms: tutti gli autenticati leggono (per cercare via codice)
CREATE POLICY "classrooms_select_authenticated"
    ON public.classrooms FOR SELECT TO authenticated USING (true);

-- classrooms: qualsiasi utente autenticato crea
CREATE POLICY "classrooms_insert_authenticated"
    ON public.classrooms FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_id);

-- classrooms: solo il creatore aggiorna/elimina
CREATE POLICY "classrooms_update_creator"
    ON public.classrooms FOR UPDATE TO authenticated
    USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "classrooms_delete_creator"
    ON public.classrooms FOR DELETE TO authenticated
    USING (auth.uid() = creator_id);

-- classroom_members: i membri leggono i partecipanti della propria classe
CREATE POLICY "members_select_own_class"
    ON public.classroom_members FOR SELECT TO authenticated
    USING (
        classroom_id IN (
            SELECT cm.classroom_id FROM public.classroom_members cm WHERE cm.user_id = auth.uid()
        )
    );

-- classroom_members: un utente inserisce solo se stesso
CREATE POLICY "members_insert_self"
    ON public.classroom_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- classroom_members: un utente rimuove solo se stesso
CREATE POLICY "members_delete_self"
    ON public.classroom_members FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- classroom_shared_resources: i membri leggono le risorse della propria classe
CREATE POLICY "resources_select_class_member"
    ON public.classroom_shared_resources FOR SELECT TO authenticated
    USING (
        classroom_id IN (
            SELECT cm.classroom_id FROM public.classroom_members cm WHERE cm.user_id = auth.uid()
        )
    );

-- classroom_shared_resources: un utente inserisce solo le proprie risorse
CREATE POLICY "resources_insert_self"
    ON public.classroom_shared_resources FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- classroom_shared_resources: un utente elimina solo le proprie risorse
CREATE POLICY "resources_delete_self"
    ON public.classroom_shared_resources FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- Supabase Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_shared_resources;

-- ============================================
-- Indici
-- ============================================
CREATE INDEX IF NOT EXISTS idx_classrooms_code ON public.classrooms(code);
CREATE INDEX IF NOT EXISTS idx_classrooms_creator ON public.classrooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON public.classroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_class ON public.classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_resources_class ON public.classroom_shared_resources(classroom_id);
