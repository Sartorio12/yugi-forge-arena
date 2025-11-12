-- Create RLS policies for the 'tournament_banners' storage bucket

-- Policy 1: Allow authenticated users to upload their own banners
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tournament_banners');

-- Policy 2: Allow public read access to all banners
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'tournament_banners');
