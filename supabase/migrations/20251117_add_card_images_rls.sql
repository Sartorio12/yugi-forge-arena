
-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('card_images', 'card_images', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy for public read access to the 'card_images' bucket
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = 'card_images');
