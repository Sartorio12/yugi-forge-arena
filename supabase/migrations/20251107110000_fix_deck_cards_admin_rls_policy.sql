-- Drop the old policy
DROP POLICY "Allow read access to deck cards based on deck privacy" ON public.deck_cards;

-- Create the new, correct policy that includes admin/organizer access
CREATE POLICY "Allow read access to deck cards based on deck privacy"
ON public.deck_cards
FOR SELECT
USING (
  -- User is the owner of the deck
  (auth.uid() = (SELECT user_id FROM public.decks WHERE id = deck_cards.deck_id))
  OR
  -- The deck is public
  ((SELECT is_private FROM public.decks WHERE id = deck_cards.deck_id) = false)
  OR
  -- User is an admin or organizer
  (auth.uid() IS NOT NULL AND (get_user_role() IN ('admin', 'organizer')))
);
