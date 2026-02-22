-- Fix RLS policies for news_posts and update public.is_admin function

-- Drop the existing public.is_admin function if it exists,
-- to allow recreation with potentially altered properties.
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Update the public.is_admin function to include 'admin' role,
-- aligning with the broader definition of privileged users.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;

    -- Now includes 'admin', 'organizer', and 'super-admin'
    RETURN user_role IN ('admin', 'organizer', 'super-admin');
END;
$$;

-- Drop the existing policy on news_posts to recreate it with the correct function call
DROP POLICY IF EXISTS "Allow full access for admins" ON public.news_posts;

-- Recreate the RLS policy for news_posts to use public.is_admin(auth.uid())
-- and ensure consistency with news_post_decks and the updated is_admin function.
CREATE POLICY "Allow full access for admins" ON public.news_posts FOR ALL TO public
USING (
    (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
)
WITH CHECK (
    (auth.uid() IS NOT NULL) AND public.is_admin(auth.uid())
);
