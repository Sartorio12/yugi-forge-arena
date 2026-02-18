-- Disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 1. Create INSERT RLS Policy for 'profiles' bucket
CREATE POLICY "Allow users to upload their own profile banners to profiles bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    (bucket_id = 'profiles') AND
    (auth.uid())::text = (storage.foldername(name))[2]
);

-- 2. Create SELECT RLS Policy for 'profiles' bucket
CREATE POLICY "Allow users to read their own profile banners from profiles bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
    (bucket_id = 'profiles') AND
    (auth.uid())::text = (storage.foldername(name))[2]
);

-- 3. Drop the temporary debug RLS Policy
DROP POLICY "DEBUG: Allow all authenticated to insert into profiles bucket" ON storage.objects;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
