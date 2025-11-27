CREATE POLICY "Allow admins to update any profile"
ON "public"."profiles"
FOR UPDATE
TO authenticated
USING (public.get_user_role() = 'admin'::text)
WITH CHECK (public.get_user_role() = 'admin'::text);
