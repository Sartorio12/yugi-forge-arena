CREATE OR REPLACE FUNCTION public.get_tournament_decks_for_admin(p_tournament_id bigint)
RETURNS TABLE (
  user_id uuid,
  deck_id bigint,
  deck_snapshot_id bigint,
  deck_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, check if the caller is an admin or organizer
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'organizer')) THEN
    RAISE EXCEPTION 'User must be an admin or organizer.';
  END IF;

  -- If they are, return the data for the specified tournament
  RETURN QUERY
  SELECT
    td.user_id,
    td.deck_id,
    td.deck_snapshot_id,
    tds.deck_name
  FROM
    public.tournament_decks as td
  LEFT JOIN
    public.tournament_deck_snapshots as tds ON td.deck_snapshot_id = tds.id
  WHERE
    td.tournament_id = p_tournament_id;
END;
$$;
