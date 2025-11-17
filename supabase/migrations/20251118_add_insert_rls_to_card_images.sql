-- Add RLS policy for allowing insert access to the 'card_images' bucket
CREATE POLICY "Allow insert for anyone" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'card_images');
