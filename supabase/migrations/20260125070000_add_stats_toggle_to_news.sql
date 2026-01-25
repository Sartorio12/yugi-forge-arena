-- Adiciona controle de exibição de estatísticas nas notícias
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS show_metagame_stats BOOLEAN DEFAULT FALSE;
