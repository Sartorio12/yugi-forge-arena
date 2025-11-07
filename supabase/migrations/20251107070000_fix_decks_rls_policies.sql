-- Add INSERT policy for decks
CREATE POLICY "Allow users to create their own decks"
ON public.decks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policies for decks
CREATE POLICY "Allow users to update their own decks"
ON public.decks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admins to update any deck"
ON public.decks
FOR UPDATE
USING (get_user_role() = 'admin');

-- Add DELETE policies for decks
CREATE POLICY "Allow users to delete their own decks"
ON public.decks
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Allow admins to delete any deck"
ON public.decks
FOR DELETE
USING (get_user_role() = 'admin');
