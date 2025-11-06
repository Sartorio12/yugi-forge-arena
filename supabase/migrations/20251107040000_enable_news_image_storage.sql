-- =================================================================
--  SQL SCRIPT FOR NEWS FEATURE RTE IMAGE STORAGE (news_content)
-- =================================================================

-- 1. CRIA O BUCKET DE ARMAZENAMENTO 'news_content'
-- Insere o novo bucket na tabela de buckets do Supabase.
-- A coluna 'public' como 'true' garante que os arquivos possam ser acessados publicamente.
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_content', 'news_content', true)
ON CONFLICT (id) DO NOTHING;


-- 2. CRIA A POLÍTICA DE LEITURA PÚBLICA
-- Permite que qualquer pessoa (autenticada ou não) possa visualizar as imagens
-- neste bucket. Isso é necessário para que as imagens apareçam nos posts.
DROP POLICY IF EXISTS "Public read access for news content" ON storage.objects;
CREATE POLICY "Public read access for news content"
ON storage.objects FOR SELECT
USING ( bucket_id = 'news_content' );


-- 3. CRIA A POLÍTICA DE ESCRITA RESTRITA (UPLOAD/DELETE)
-- Permite que apenas usuários com a role 'admin' ou 'organizer' possam
-- fazer upload, atualizar ou deletar imagens neste bucket.
DROP POLICY IF EXISTS "Admin and Organizer write access for news content" ON storage.objects;
CREATE POLICY "Admin and Organizer write access for news content"
ON storage.objects FOR ALL -- Aplica para INSERT, UPDATE, DELETE
WITH CHECK (
  bucket_id = 'news_content'
  AND auth.role() = 'authenticated'
  AND (get_user_role() IN ('admin', 'organizer'))
);
