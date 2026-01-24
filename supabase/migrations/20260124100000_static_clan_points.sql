-- 1. Add clan_id column to tournament_participants to store the snapshot
-- This column will hold the clan the user belonged to AT THE TIME of the tournament
ALTER TABLE public.tournament_participants
ADD COLUMN IF NOT EXISTS clan_id BIGINT REFERENCES public.clans(id) ON DELETE SET NULL;

-- 2. Backfill: "Stamp" existing tournament records with the user's CURRENT clan
-- This runs immediately to capture the "state of the world" right now.
-- It ensures existing tournaments are credited to the clan the user is currently in.
UPDATE public.tournament_participants tp
SET clan_id = cm.clan_id
FROM public.clan_members cm
WHERE tp.user_id = cm.user_id
AND tp.clan_id IS NULL; -- Only update records that haven't been stamped yet

-- 3. Function to automatically stamp the clan_id on new tournament registration
CREATE OR REPLACE FUNCTION public.set_tournament_participant_clan()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the user is currently in a clan and save that ID
    SELECT clan_id INTO NEW.clan_id
    FROM public.clan_members
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger to fire the function on insert
DROP TRIGGER IF EXISTS trigger_set_tournament_participant_clan ON public.tournament_participants;
CREATE TRIGGER trigger_set_tournament_participant_clan
BEFORE INSERT ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION public.set_tournament_participant_clan();

-- 5. Update the Clan Rankings View to calculate points based on the SNAPSHOT (tournament_participants.clan_id)
-- instead of the current membership (clan_members).
DROP VIEW IF EXISTS public.clan_rankings_view;

CREATE OR REPLACE VIEW public.clan_rankings_view AS
SELECT
    c.id AS clan_id,
    c.name AS clan_name,
    c.tag AS clan_tag,
    c.icon_url AS clan_image_url,
    -- Sum points where the PARTICIPATION record belongs to the clan
    -- (wins * 5 points)
    COALESCE(SUM(tp.total_wins_in_tournament * 5), 0) AS total_clan_points
FROM
    public.clans c
LEFT JOIN
    public.tournament_participants tp ON c.id = tp.clan_id
GROUP BY
    c.id, c.name, c.tag, c.icon_url
ORDER BY
    total_clan_points DESC;