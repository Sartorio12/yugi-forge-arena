
-- Add organizer_id and exclusive_organizer_only columns to tournaments table
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS exclusive_organizer_only BOOLEAN DEFAULT FALSE;

-- Update policies to respect the exclusive flag

-- 1. Tournament Decks
DROP POLICY IF EXISTS "Allow admins and organizers to view tournament decks" ON public.tournament_decks;

CREATE POLICY "Allow admins and organizers to view tournament decks"
ON public.tournament_decks
FOR SELECT
TO public
USING (
  -- User is admin or organizer
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'organizer')
  )
  AND (
    -- EITHER the tournament is NOT exclusive
    NOT EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_decks.tournament_id
      AND t.exclusive_organizer_only = true
    )
    -- OR the user IS the organizer of the exclusive tournament
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_decks.tournament_id
      AND t.exclusive_organizer_only = true
      AND t.organizer_id = auth.uid()
    )
  )
);


-- 2. Tournament Deck Snapshots
DROP POLICY IF EXISTS "Allow admins to view all snapshots" ON public.tournament_deck_snapshots;

CREATE POLICY "Allow admins to view all snapshots"
ON public.tournament_deck_snapshots
FOR SELECT
TO public
USING (
  public.is_admin(auth.uid())
  AND (
    -- EITHER the tournament is NOT exclusive
    NOT EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_deck_snapshots.tournament_id
      AND t.exclusive_organizer_only = true
    )
    -- OR the user IS the organizer of the exclusive tournament
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_deck_snapshots.tournament_id
      AND t.exclusive_organizer_only = true
      AND t.organizer_id = auth.uid()
    )
  )
);

-- 3. Tournament Deck Snapshot Cards (Indirectly via snapshot)
-- This table already relies on being able to select the snapshot.
-- "Allow admins to view all snapshot cards" checks "public.is_admin(auth.uid())".
-- We need to update this too because it doesn't join with the tournament to check the flag.
DROP POLICY IF EXISTS "Allow admins to view all snapshot cards" ON public.tournament_deck_snapshot_cards;

CREATE POLICY "Allow admins to view all snapshot cards"
ON public.tournament_deck_snapshot_cards
FOR SELECT
TO public
USING (
  public.is_admin(auth.uid())
  AND (
     -- We need to join up to tournament. Snapshot -> Tournament
     EXISTS (
       SELECT 1 FROM public.tournament_deck_snapshots s
       JOIN public.tournaments t ON t.id = s.tournament_id
       WHERE s.id = tournament_deck_snapshot_cards.snapshot_id
       AND (
          t.exclusive_organizer_only = false
          OR t.organizer_id = auth.uid()
       )
     )
  )
);
