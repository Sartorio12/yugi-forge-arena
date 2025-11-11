
DROP POLICY IF EXISTS "Clan owners can delete members from their clan." ON "public"."clan_members";

CREATE POLICY "Leaders and Strategists can delete members from their clan." ON "public"."clan_members" FOR DELETE USING (
  (SELECT owner_id FROM public.clans WHERE id = clan_id) = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM public.clan_members cm
    WHERE cm.clan_id = clan_members.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'STRATEGIST'
  )
);
