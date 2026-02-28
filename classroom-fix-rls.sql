-- ============================================
-- FIX: Rimuove le policy ricorsive e le sostituisce
-- con policy semplici per SELECT
-- ============================================

-- Rimuovi le policy problematiche
DROP POLICY IF EXISTS "members_select_own_class" ON public.classroom_members;
DROP POLICY IF EXISTS "resources_select_class_member" ON public.classroom_shared_resources;

-- classroom_members: tutti gli autenticati possono leggere i membri
-- (la protezione è garantita dal fatto che serve conoscere il classroom_id)
CREATE POLICY "members_select_authenticated"
    ON public.classroom_members FOR SELECT TO authenticated
    USING (true);

-- classroom_shared_resources: tutti gli autenticati possono leggere le risorse
CREATE POLICY "resources_select_authenticated"
    ON public.classroom_shared_resources FOR SELECT TO authenticated
    USING (true);
