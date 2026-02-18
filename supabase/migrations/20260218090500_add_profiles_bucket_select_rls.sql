-- Disable RLS for a moment to ensure policy creation
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Create an RLS policy for the 'profiles' bucket to allow authenticated users to read their own banners
CREATE POLICY "Allow users to read their own profile banners from profiles bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
    (bucket_id = 'profiles') AND
    (auth.uid())::text = (storage.foldername(name))[2]
);

-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
