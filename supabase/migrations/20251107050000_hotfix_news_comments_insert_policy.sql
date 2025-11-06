-- =================================================================
--  HOTFIX: Correct RLS Policy for 'news_comments' Table
-- =================================================================

-- 1. Drop the existing INSERT policy on public.news_comments
DROP POLICY IF EXISTS "Allow authenticated users to comment" ON public.news_comments;

-- 2. Create a new INSERT policy allowing any authenticated user to post.
--    WARNING: This policy allows any authenticated user to insert a comment
--    with *any* user_id. If the intention is for users to only post comments
--    as themselves, the policy should be 'WITH CHECK (auth.uid() = user_id)'.
--    Please ensure this is the desired behavior.
CREATE POLICY "Allow authenticated users to post news comments"
ON public.news_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
