DROP POLICY IF EXISTS "Allow full access for admins" ON public.news_post_decks;

CREATE POLICY "Allow full access for admins" ON public.news_post_decks FOR ALL TO public
USING (
    (auth.uid() IS NOT NULL) AND
    (
        get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text, 'super-admin'::text])
        OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
    )
)
WITH CHECK (
    (auth.uid() IS NOT NULL) AND
    (
        get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text, 'super-admin'::text])
        OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f'::uuid
    )
);
