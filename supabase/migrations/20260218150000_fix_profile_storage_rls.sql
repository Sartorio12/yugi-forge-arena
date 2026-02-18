-- Fix RLS policies for 'profiles' bucket to allow users to manage their own banners and avatars
-- The current policy fails because 'public/' is the first folder, not the user_id.

-- 1. Remove old restrictive policies for 'profiles' bucket
DROP POLICY IF EXISTS "Allow users to upload their own profile banners to profiles buc" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own profile banners from profiles buc" ON storage.objects;

-- 2. Create comprehensive policies for 'profiles' bucket
-- Note: we check if the path starts with 'public/' AND the second part is the user's ID.

-- SELECT: Allow anyone to view profile images (publicly accessible)
CREATE POLICY "Public Read Access for Profiles"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- INSERT: Allow users to upload to their own folder inside 'public/'
CREATE POLICY "Users can upload their own profile assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

-- UPDATE: Allow users to update their own profile assets
CREATE POLICY "Users can update their own profile assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND
    (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

-- DELETE: Allow users to delete their own profile assets
CREATE POLICY "Users can delete their own profile assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = 'public' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

-- 3. Also fix 'tournament_banners' bucket which might have the same issue if it uses subfolders
-- Ensure super-admin (SPOOKY) has full bypass for profiles as well
CREATE POLICY "Super Admin Full Access Profiles"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
)
WITH CHECK (
    bucket_id = 'profiles' AND 
    (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
);
