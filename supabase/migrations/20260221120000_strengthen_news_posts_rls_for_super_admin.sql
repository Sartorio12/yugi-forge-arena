-- Strengthen RLS policy for news_posts to explicitly include super-admin UID

-- Drop the existing policy on news_posts to recreate it with enhanced super-admin access
DROP POLICY IF EXISTS "Allow full access for admins" ON public.news_posts;

-- Recreate the RLS policy for news_posts to use public.is_admin(auth.uid())
-- AND explicitly allow the hardcoded super-admin UID for robustness.
CREATE POLICY "Allow full access for admins" ON public.news_posts FOR ALL TO public
USING (
    (auth.uid() IS NOT NULL) AND
    (
        public.is_admin(auth.uid())
        OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
    )
)
WITH CHECK (
    (auth.uid() IS NOT NULL) AND
    (
        public.is_admin(auth.uid())
        OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
    )
);
