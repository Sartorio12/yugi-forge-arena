-- Migration: Add storage policies for clan_icons bucket
-- Date: 2026-02-20

-- 1. Anyone can view clan icons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Anyone can view clan icons' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Anyone can view clan icons"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'clan_icons');
    END IF;
END $$;

-- 2. Authenticated users can upload clan icons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Authenticated users can upload clan icons' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload clan icons"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'clan_icons' AND (storage.foldername(name))[1] = 'public');
    END IF;
END $$;

-- 3. Admins and Super-Admins can manage clan icons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can manage clan icons' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Admins can manage clan icons"
        ON storage.objects FOR ALL
        TO authenticated
        USING (
            bucket_id = 'clan_icons' AND 
            (is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
        )
        WITH CHECK (
            bucket_id = 'clan_icons' AND 
            (is_admin() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid)
        );
    END IF;
END $$;
