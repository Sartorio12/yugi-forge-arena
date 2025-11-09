-- Create storage bucket for clan icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('clan_icons', 'clan_icons', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for the clan_icons bucket
-- Allow authenticated users to upload icons
CREATE POLICY "Allow authenticated users to upload clan icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clan_icons');

-- Allow anyone to view public clan icons
CREATE POLICY "Allow public read access to clan icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'clan_icons');
