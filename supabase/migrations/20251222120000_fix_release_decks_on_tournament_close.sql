-- Step 1: Alter the table to allow tournament_id to be NULL
ALTER TABLE public.tournament_deck_snapshots
ALTER COLUMN tournament_id DROP NOT NULL;

-- Step 2: Replace the function to update instead of delete
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

  -- Disassociate deck snapshots from the tournament instead of deleting them.
  -- This is to prevent breaking foreign key constraints if a snapshot is
  -- referenced in a news post.
  UPDATE public.tournament_deck_snapshots
  SET tournament_id = NULL
  WHERE tournament_id = p_tournament_id;

END;
$$;

-- Grant execute permissions to the function
GRANT EXECUTE ON FUNCTION public.release_decks_for_tournament(bigint) TO authenticated;
