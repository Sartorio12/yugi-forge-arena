
DROP POLICY IF EXISTS "Users can view their own applications." ON public.clan_applications;

CREATE POLICY "Allow clan leaders and strategists to view applications to their clan."
ON public.clan_applications
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (
    auth.uid() IN (
      SELECT cm.user_id
      FROM public.clan_members cm
      WHERE cm.clan_id = clan_applications.clan_id
        AND cm.role IN ('LEADER', 'STRATEGIST')
    )
  )
);
