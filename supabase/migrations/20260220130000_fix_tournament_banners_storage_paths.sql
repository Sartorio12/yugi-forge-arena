-- Migration: Fix Tournament Banners RLS paths
-- Date: 2026-02-20

-- 1. Correct User Upload Policy for Storage
-- The path is now simply "{user_id}/{filename}"
DROP POLICY IF EXISTS "User Upload Own Banners" ON storage.objects;
CREATE POLICY "User Upload Own Banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tournament_banners' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Correct Admin Management Policy for Storage
DROP POLICY IF EXISTS "Admin/Organizer Manage Banners" ON storage.objects;
CREATE POLICY "Admin/Organizer Manage Banners"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'tournament_banners' AND 
    (is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
)
WITH CHECK (
    bucket_id = 'tournament_banners' AND 
    (is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
);

-- 3. Correct Delete policy for users
DROP POLICY IF EXISTS "User Delete Own Banners" ON storage.objects;
CREATE POLICY "User Delete Own Banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'tournament_banners' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
