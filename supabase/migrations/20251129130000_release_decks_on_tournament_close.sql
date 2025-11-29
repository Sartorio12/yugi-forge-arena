
-- Function to release decks associated with a tournament
CREATE OR REPLACE FUNCTION public.release_decks_for_tournament(p_tournament_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete entries from tournament_decks for the given tournament
  -- This effectively "releases" the decks by removing their association with the tournament
  DELETE FROM public.tournament_decks
  WHERE tournament_id = p_tournament_id;

  -- Optionally, delete the corresponding deck snapshots
  -- This depends on whether snapshots need to be retained for historical purposes
  -- For now, we'll assume they can be deleted as the tournament is closed.
  DELETE FROM public.tournament_deck_snapshots
  WHERE tournament_id = p_tournament_id;

END;
$$;

-- Grant usage and execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.release_decks_for_tournament(bigint) TO authenticated;
