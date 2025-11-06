-- =================================================================
--  CRITICAL HOTFIX 2: Correct 'news_comments' INSERT Policy
-- =================================================================

-- 1. Drop the previous, incorrect INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to post news comments" ON public.news_comments;

-- 2. Create the new, correct INSERT policy
--    This policy ensures that an authenticated user can only insert a comment
--    if the 'user_id' in the comment matches their own authenticated user ID (auth.uid()).
CREATE POLICY "Allow users to post comments as themselves"
ON public.news_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);
