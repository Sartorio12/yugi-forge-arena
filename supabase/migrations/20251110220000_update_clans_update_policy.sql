
DROP POLICY IF EXISTS "Clan owners can update their own clan." ON "public"."clans";

CREATE POLICY "Leaders and Strategists can update their clan." ON "public"."clans" FOR UPDATE USING (
  (auth.uid() = owner_id) OR
  EXISTS (
    SELECT 1
    FROM public.clan_members
    WHERE clan_id = clans.id
      AND user_id = auth.uid()
      AND role = 'STRATEGIST'
  )
);
