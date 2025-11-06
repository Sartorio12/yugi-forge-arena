ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access based on privacy"
ON public.decks
FOR SELECT
USING (
  is_private = false
  OR
  (auth.uid() = user_id)
  OR
  (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')))
);