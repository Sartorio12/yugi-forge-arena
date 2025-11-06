-- Tabela 1: Likes nos Artigos
CREATE TABLE public.news_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    UNIQUE (post_id, user_id)
);

-- Tabela 2: Comentários nos Artigos
CREATE TABLE public.news_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para NEWS_LIKES
CREATE POLICY "Allow public read access" ON public.news_likes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to like" ON public.news_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user to unlike" ON public.news_likes FOR DELETE USING (auth.uid() = user_id);

-- Políticas para NEWS_COMMENTS
CREATE POLICY "Allow public read access" ON public.news_comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to comment" ON public.news_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user to delete their own comments" ON public.news_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to delete any comment" ON public.news_comments FOR DELETE USING (get_user_role() IN ('admin', 'organizer'));
