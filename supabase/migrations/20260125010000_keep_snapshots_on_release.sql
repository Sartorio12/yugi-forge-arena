-- Fix for tournament deck release logic
-- This version clears the 'tournament_decks' (the locks) but LEAVES the 'tournament_deck_snapshots' (the history) linked to the tournament.
-- This allows tournament decks to be listed in News/Spotlight even after the tournament is closed.

CREATE OR REPLACE FUNCTION public.release_decks_for_tournament(p_tournament_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete entries from tournament_decks (unlocks the original decks)
  DELETE FROM public.tournament_decks
  WHERE tournament_id = p_tournament_id;

  -- 2. We NO LONGER update tournament_deck_snapshots to NULL.
  -- We want to keep the historical record of which decks were in which tournament.
  -- The decks are already 'free' because tournament_decks is empty.
  
  -- Logic removed:
  -- UPDATE public.tournament_deck_snapshots SET tournament_id = NULL WHERE tournament_id = p_tournament_id;
END;
$$;

-- Grant execute permissions to the function
GRANT EXECUTE ON FUNCTION public.release_decks_for_tournament(bigint) TO authenticated;
