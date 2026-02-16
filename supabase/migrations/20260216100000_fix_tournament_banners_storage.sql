-- 1. Remover apenas as políticas que eu mesmo criei anteriormente para evitar erros de permissão de sistema
DROP POLICY IF EXISTS "Public Read Access for Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin/Organizer Manage Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage Public Banners" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Own Banners" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own Banners" ON storage.objects;

-- 2. Recriar as políticas com escopo correto

-- LEITURA: Qualquer um vê
CREATE POLICY "Public Read Access for Banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament_banners');

-- ADMINS: Acesso total ao bucket, incluindo a pasta 'public'
CREATE POLICY "Admin/Organizer Manage Banners"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'tournament_banners' AND 
    (public.is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
)
WITH CHECK (
    bucket_id = 'tournament_banners' AND 
    (public.is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
);

-- USUÁRIOS: Apenas suas próprias pastas (IDs)
CREATE POLICY "User Upload Own Banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tournament_banners' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "User Delete Own Banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'tournament_banners' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
);
