-- Permite que notícias usem apenas snapshots (fotos históricas) sem precisar do deck original ativo
ALTER TABLE public.news_post_decks ALTER COLUMN deck_id DROP NOT NULL;

-- Adiciona uma regra de segurança: ou tem o deck original, ou tem o snapshot (não pode ser ambos nulos)
ALTER TABLE public.news_post_decks DROP CONSTRAINT IF EXISTS news_post_decks_check_ids;
ALTER TABLE public.news_post_decks ADD CONSTRAINT news_post_decks_check_ids 
CHECK (deck_id IS NOT NULL OR deck_snapshot_id IS NOT NULL);
