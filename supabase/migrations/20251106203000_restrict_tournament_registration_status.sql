-- This policy ensures users can only register for tournaments that are explicitly 'Aberto'.

ALTER POLICY "Allow users to insert their own participation"
ON public.tournament_participants
WITH CHECK (
  auth.uid() = user_id AND 
  (
    SELECT status
    FROM public.tournaments
    WHERE id = tournament_id
  ) = 'Aberto'
);
