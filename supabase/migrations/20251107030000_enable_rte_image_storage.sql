-- =================================================================
--  SQL SCRIPT FOR RTE IMAGE STORAGE (tournament_content)
-- =================================================================

-- 1. CRIA O BUCKET DE ARMAZENAMENTO 'tournament_content'
-- Insere o novo bucket na tabela de buckets do Supabase.
-- A coluna 'public' como 'true' garante que os arquivos podem ser acessados publicamente.
-- NOTA: A maneira mais comum é criar o bucket através do Dashboard do Supabase,
-- o que também lida com a configuração de arquivos. Este script é a alternativa via SQL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament_content', 'tournament_content', true)
ON CONFLICT (id) DO NOTHING;


-- 2. HABILITA RLS (Row Level Security) NA TABELA DE OBJETOS DO STORAGE
-- Isso garante que as políticas abaixo serão aplicadas.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- 3. CRIA A POLÍTICA DE LEITURA PÚBLICA
-- Permite que qualquer pessoa (autenticada ou não) possa visualizar as imagens
-- neste bucket. Isso é necessário para que as imagens apareçam no site.
DROP POLICY IF EXISTS "Public read access for tournament content" ON storage.objects;
CREATE POLICY "Public read access for tournament content"
ON storage.objects FOR SELECT
USING ( bucket_id = 'tournament_content' );


-- 4. CRIA A POLÍTICA DE ESCRITA RESTRITA (UPLOAD/DELETE)
-- Permite que apenas usuários com a role 'admin' ou 'organizer' possam
-- fazer upload, atualizar ou deletar imagens neste bucket.
DROP POLICY IF EXISTS "Admin and Organizer write access for tournament content" ON storage.objects;
CREATE POLICY "Admin and Organizer write access for tournament content"
ON storage.objects FOR ALL -- Aplica para INSERT, UPDATE, DELETE
WITH CHECK (
  bucket_id = 'tournament_content'
  AND auth.role() = 'authenticated'
  AND (get_user_role() IN ('admin', 'organizer'))
);
