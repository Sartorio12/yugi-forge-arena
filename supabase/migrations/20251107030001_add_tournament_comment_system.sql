-- =================================================================
--  SQL SCRIPT FOR TOURNAMENT COMMENT SYSTEM
-- =================================================================

-- 1. CRIA A TABELA 'tournament_comments'
CREATE TABLE public.tournament_comments (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITA RLS (Row Level Security) NA TABELA 'tournament_comments'
ALTER TABLE public.tournament_comments ENABLE ROW LEVEL SECURITY;


-- 3. CRIA A POLÍTICA DE LEITURA PÚBLICA
-- Permite que qualquer pessoa (autenticada ou não) possa ler os comentários.
DROP POLICY IF EXISTS "Public read access to tournament comments" ON public.tournament_comments;
CREATE POLICY "Public read access to tournament comments"
ON public.tournament_comments FOR SELECT
USING (true);


-- 4. CRIA A POLÍTICA DE INSERÇÃO
-- Permite que apenas usuários autenticados possam criar comentários, e apenas para si mesmos.
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.tournament_comments;
CREATE POLICY "Authenticated users can create comments"
ON public.tournament_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- 5. CRIA AS POLÍTICAS DE EXCLUSÃO
-- Permite que usuários excluam seus próprios comentários.
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.tournament_comments;
CREATE POLICY "Users can delete their own comments"
ON public.tournament_comments FOR DELETE
USING (auth.uid() = user_id);

-- Permite que admins e organizadores excluam qualquer comentário.
DROP POLICY IF EXISTS "Admins and organizers can delete any comment" ON public.tournament_comments;
CREATE POLICY "Admins and organizers can delete any comment"
ON public.tournament_comments FOR DELETE
USING (get_user_role() IN ('admin', 'organizer'));
