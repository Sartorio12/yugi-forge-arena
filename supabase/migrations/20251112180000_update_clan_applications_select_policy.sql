
DROP POLICY IF EXISTS "Users can view their own applications." ON public.clan_applications;

CREATE POLICY "Users can view their own applications."
ON public.clan_applications
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (auth.uid() IN (SELECT owner_id FROM public.clans WHERE id = clan_id))
);
