-- 1. Remover a coluna antiga (DESTRUTIVO, FAÇA BACKUP SE NECESSÁRIO)
ALTER TABLE public.news_posts
DROP COLUMN champion_deck_id;

-- 2. Criar a nova tabela de junção
CREATE TABLE public.news_post_decks (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    placement TEXT NOT NULL -- Ex: "1º Lugar", "Top 4", "Deck Destaque"
);

-- 3. Habilitar RLS e adicionar políticas
ALTER TABLE public.news_post_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.news_post_decks FOR SELECT USING (true);
CREATE POLICY "Allow full access for admins" ON public.news_post_decks FOR ALL 
    USING (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')))
    WITH CHECK (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')));
