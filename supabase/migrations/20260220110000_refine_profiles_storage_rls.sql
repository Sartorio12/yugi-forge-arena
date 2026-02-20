-- Migration: Refine Profiles Storage Policies and increase robustness
-- Date: 2026-02-20

-- 1. Ensure bucket is public and has correct size limit (already done via command, but good for record)
-- UPDATE storage.buckets SET public = true, file_size_limit = 10485760 WHERE id = 'profiles';

-- 2. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Public Read Access for Profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile assets" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin Full Access Profiles" ON storage.objects;

-- 3. Recreate policies with optimized checks

-- SELECT: Public access to all profile assets
CREATE POLICY "Profiles_Public_Select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- ALL: Super Admin has full control
CREATE POLICY "Profiles_SuperAdmin_All"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
)
WITH CHECK (
    bucket_id = 'profiles' AND 
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
);

-- ALL: Users can manage their own folder (public/{uid}/*)
-- Using ALL simplifies upsert/overwrite operations
CREATE POLICY "Profiles_Owner_Manage"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND 
    (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND 
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Explicitly allow INSERT for cases where ALL might not be enough for some drivers
CREATE POLICY "Profiles_Owner_Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND 
    (storage.foldername(name))[2] = auth.uid()::text
);
