-- Fix RLS for 'profiles' bucket to correctly use the user ID from the path.

-- Disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Allow users to upload their own profile banners to profiles bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own profile banners from profiles bucket" ON storage.objects;
DROP POLICY IF EXISTS "DEBUG: Allow all authenticated to insert into profiles bucket" ON storage.objects;

-- 1. Create/Recreate INSERT RLS Policy for 'profiles' bucket
CREATE POLICY "Allow users to upload their own profile banners to profiles bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    (bucket_id = 'profiles') AND
    (auth.uid())::text = (storage.foldername(name))[1] -- Corrected index from [2] to [1]
);

-- 2. Create/Recreate SELECT RLS Policy for 'profiles' bucket
CREATE POLICY "Allow users to read their own profile banners from profiles bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
    (bucket_id = 'profiles') AND
    (auth.uid())::text = (storage.foldername(name))[1] -- Corrected index from [2] to [1]
);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
