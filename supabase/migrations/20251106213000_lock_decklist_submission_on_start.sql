-- This policy locks decklist submissions for non-admins once a tournament has started or is no longer open.

ALTER POLICY "Allow user to update their own decklist"
ON public.tournament_participants
FOR UPDATE
USING (auth.uid() = user_id) -- The policy applies to rows owned by the user.
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE id = tournament_id
      AND status = 'Aberto'      -- Condition 1: Tournament must be open.
      AND event_date > NOW() -- Condition 2: Tournament event date must be in the future.
  )
);