-- Configuração do Storage para Clãs

-- 1. Criar o bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('clan_icons', 'clan_icons', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que qualquer pessoa veja as imagens (público)
CREATE POLICY "Ícones de Clã são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'clan_icons');

-- 3. Permitir que usuários autenticados façam upload
CREATE POLICY "Usuários logados podem subir ícones de clã"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clan_icons');

-- 4. Permitir que o dono do arquivo o delete ou atualize
CREATE POLICY "Usuários podem gerenciar seus próprios ícones"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'clan_icons');

CREATE POLICY "Usuários podem deletar seus próprios ícones"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);
