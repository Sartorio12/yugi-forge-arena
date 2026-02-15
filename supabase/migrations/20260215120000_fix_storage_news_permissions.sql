-- Fix Storage RLS policies for news_content bucket to include super-admin

BEGIN;

-- 1. Ensure the bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'news_content';

-- 2. Clean up existing policies for news_content (using proper SQL commands)
DROP POLICY IF EXISTS "Admins and Super-Admins can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view news images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and Super-Admins can manage news images" ON storage.objects;
-- Also drop old ones from previous migrations if they exist with different names
DROP POLICY IF EXISTS "Admins can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view news images" ON storage.objects;

-- 3. Policy: Allow authenticated admins and super-admins to upload files
CREATE POLICY "Admins and Super-Admins can upload news images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'news_content' AND 
    (public.get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text, 'organizer'::text]))
);

-- 4. Policy: Allow anyone to view news images
CREATE POLICY "Anyone can view news images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'news_content');

-- 5. Policy: Allow admins to update/delete images
CREATE POLICY "Admins and Super-Admins can manage news images"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'news_content' AND 
    (public.get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text, 'organizer'::text]))
);

COMMIT;
