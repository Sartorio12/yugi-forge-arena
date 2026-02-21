-- Migration: Allow Super Admin full control over Tournament Banners (Table and Storage)
-- Date: 2026-02-20

-- 1. Table: user_tournament_banners
DROP POLICY IF EXISTS "Super Admin Manage All Tournament Banners" ON public.user_tournament_banners;
CREATE POLICY "Super Admin Manage All Tournament Banners"
ON public.user_tournament_banners FOR ALL
TO authenticated
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
WITH CHECK (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid);

-- 2. Storage: tournament_banners bucket
-- We need to allow the Super Admin to bypass the folder-matching rule.
DROP POLICY IF EXISTS "Super Admin Full Access Tournament Banners Storage" ON storage.objects;
CREATE POLICY "Super Admin Full Access Tournament Banners Storage"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'tournament_banners' AND 
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
)
WITH CHECK (
    bucket_id = 'tournament_banners' AND 
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
);

-- Ensure public select remains working
DROP POLICY IF EXISTS "Public Read Access for Banners" ON storage.objects;
CREATE POLICY "Public Read Access for Banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament_banners');
