-- Tabela 1: Para rastrear "Likes"
CREATE TABLE public.deck_likes (
    id BIGSERIAL PRIMARY KEY,
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Garante que um usuário só possa curtir um deck uma vez
    UNIQUE (deck_id, user_id)
);

-- Tabela 2: Para rastrear "Comentários"
CREATE TABLE public.deck_comments (
    id BIGSERIAL PRIMARY KEY,
    deck_id BIGINT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (char_length(comment_text) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.deck_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para DECK_LIKES
CREATE POLICY "Allow public read access" ON public.deck_likes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to like" ON public.deck_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user to unlike" ON public.deck_likes FOR DELETE USING (auth.uid() = user_id);

-- Políticas para DECK_COMMENTS
CREATE POLICY "Allow public read access" ON public.deck_comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to comment" ON public.deck_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user to delete their own comments" ON public.deck_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to delete any comment" ON public.deck_comments FOR DELETE USING (get_user_role() IN ('admin', 'organizer'));
