-- Update the RPC function to allow super-admin and the specific ID
CREATE OR REPLACE FUNCTION public.get_tournament_decks_for_admin(p_tournament_id bigint)
 RETURNS TABLE(user_id uuid, deck_id bigint, deck_snapshot_id bigint, deck_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if the caller is an admin, organizer OR super-admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'organizer', 'super-admin') OR id = '80193776-6790-457c-906d-ed45ea16df9f')
  ) THEN
    RAISE EXCEPTION 'User must be an admin, organizer or super-admin.';
  END IF;

  -- Return the data for the specified tournament
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
$function$;

-- Update the RLS policy for tournament_decks to include super-admin
DROP POLICY IF EXISTS "Allow admins and organizers to view tournament decks" ON public.tournament_decks;
CREATE POLICY "Allow admins and organizers to view tournament decks" ON public.tournament_decks FOR SELECT TO public USING (
  (EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'organizer', 'super-admin') OR profiles.id = '80193776-6790-457c-906d-ed45ea16df9f')
  )) 
  AND 
  (
    (NOT (EXISTS ( 
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_decks.tournament_id AND t.exclusive_organizer_only = true
    ))) 
    OR 
    (EXISTS ( 
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_decks.tournament_id AND t.exclusive_organizer_only = true AND (t.organizer_id = auth.uid() OR auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f')
    ))
  )
);

-- Also update tournament_deck_snapshots RLS just in case
DROP POLICY IF EXISTS "Allow admins and organizers to view tournament deck snapshots" ON public.tournament_deck_snapshots;
CREATE POLICY "Allow admins and organizers to view tournament deck snapshots" ON public.tournament_deck_snapshots FOR SELECT TO public USING (
  (EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'organizer', 'super-admin') OR profiles.id = '80193776-6790-457c-906d-ed45ea16df9f')
  ))
);
