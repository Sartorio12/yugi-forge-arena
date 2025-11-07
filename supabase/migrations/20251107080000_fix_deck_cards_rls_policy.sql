-- Enable RLS for deck_cards
ALTER TABLE public.deck_cards ENABLE ROW LEVEL SECURITY;

-- Policies for deck_cards
CREATE POLICY "Allow read access to deck cards based on deck privacy"
ON public.deck_cards
FOR SELECT
USING (
  (auth.uid() = (SELECT user_id FROM public.decks WHERE id = deck_cards.deck_id))
  OR
  ((SELECT is_private FROM public.decks WHERE id = deck_cards.deck_id) = false)
);

CREATE POLICY "Allow users to insert cards into their own decks"
ON public.deck_cards
FOR INSERT
WITH CHECK (
  (auth.uid() = (SELECT user_id FROM public.decks WHERE id = deck_cards.deck_id))
);

CREATE POLICY "Allow users to update cards in their own decks"
ON public.deck_cards
FOR UPDATE
USING (
  (auth.uid() = (SELECT user_id FROM public.decks WHERE id = deck_cards.deck_id))
);

CREATE POLICY "Allow users to delete cards from their own decks"
ON public.deck_cards
FOR DELETE
USING (
  (auth.uid() = (SELECT user_id FROM public.decks WHERE id = deck_cards.deck_id))
);
