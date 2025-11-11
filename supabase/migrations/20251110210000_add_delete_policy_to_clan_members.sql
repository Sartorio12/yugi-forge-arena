
CREATE POLICY "Clan owners can delete members from their clan." ON "public"."clan_members" FOR DELETE USING (
  (SELECT owner_id FROM public.clans WHERE id = clan_id) = auth.uid()
);
