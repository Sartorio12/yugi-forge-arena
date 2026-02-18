-- Disable RLS for a moment
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Temporarily allow ALL authenticated users to INSERT into 'profiles' bucket
CREATE POLICY "DEBUG: Allow all authenticated to insert into profiles bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
