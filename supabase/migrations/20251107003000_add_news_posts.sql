-- Tabela 1: Para armazenar as postagens de notícias/reports
CREATE TABLE public.news_posts (
    id BIGSERIAL PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL CHECK (char_length(title) > 0),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Opcional, mas recomendado: link para o torneio sobre o qual é o report
    tournament_id BIGINT REFERENCES public.tournaments(id) ON DELETE SET NULL,
    
    -- A feature-chave: anexar a decklist do campeão
    champion_deck_id BIGINT REFERENCES public.decks(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Regra 1: Todos podem ler as notícias.
CREATE POLICY "Allow public read access to news" 
ON public.news_posts FOR SELECT USING (true);

-- Regra 2: Apenas Admins/Organizadores podem criar, editar ou apagar notícias.
CREATE POLICY "Allow full access for admins and organizers" 
ON public.news_posts FOR ALL 
USING (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')))
WITH CHECK (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')));
