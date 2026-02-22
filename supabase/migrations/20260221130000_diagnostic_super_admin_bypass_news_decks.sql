-- Diagnostic RLS policy for news_post_decks: allow super-admin by UID

-- This policy is for diagnostic purposes to isolate issues with role checking.
-- It grants full access to news_post_decks if the authenticated user's UID
-- matches the hardcoded super-admin UID, completely bypassing get_user_role() and is_admin().

DROP POLICY IF EXISTS "Allow super-admin by UID for news_post_decks" ON public.news_post_decks;

CREATE POLICY "Allow super-admin by UID for news_post_decks" ON public.news_post_decks FOR ALL TO public
USING (
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
)
WITH CHECK (
    auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
);
