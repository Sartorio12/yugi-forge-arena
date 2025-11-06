-- 1. Add deck_id column to tournament_participants
ALTER TABLE public.tournament_participants
ADD COLUMN deck_id BIGINT REFERENCES public.decks(id) ON DELETE SET NULL;

-- 2. Add RLS policy to allow users to update their own decklist submission
CREATE POLICY "Allow user to update their own decklist"
ON public.tournament_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
