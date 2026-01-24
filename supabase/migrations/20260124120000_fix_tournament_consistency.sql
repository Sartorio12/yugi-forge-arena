-- 1. Update get_tournament_participants to use the STAMPED clan_id
-- This ensures the UI displays the clan the user actually represented in that tournament,
-- rather than their current clan.
CREATE OR REPLACE FUNCTION "public"."get_tournament_participants"("p_tournament_id" bigint) 
RETURNS TABLE(
    "id" bigint, 
    "total_wins_in_tournament" integer, 
    "deck_id" bigint, 
    "deck_name" "text", 
    "profile_id" "uuid", 
    "profile_username" "text", 
    "profile_avatar_url" "text", 
    "clan_tag" "text",
    "team_selection" "text"
)
LANGUAGE "plpgsql"
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.id,
        tp.total_wins_in_tournament,
        tp.deck_id,
        d.deck_name,
        p.id as profile_id,
        p.username as profile_username,
        p.avatar_url as profile_avatar_url,
        c.tag as clan_tag, -- Now fetching from the clan linked to the participation
        tp.team_selection
    FROM
        public.tournament_participants tp
    LEFT JOIN
        public.profiles p ON tp.user_id = p.id
    LEFT JOIN
        public.decks d ON tp.deck_id = d.id
    LEFT JOIN
        public.clans c ON tp.clan_id = c.id -- Direct join to the stamped clan
    WHERE
        tp.tournament_id = p_tournament_id
    ORDER BY
        tp.id ASC; -- Stable sorting
END;
$$;

-- 2. Trigger function to REMOVE clan_id from OPEN tournaments when a user leaves a clan
CREATE OR REPLACE FUNCTION public.remove_tournament_clan_on_leave()
RETURNS TRIGGER AS $$
BEGIN
    -- Update participation records for OPEN tournaments ("Aberto")
    -- Set clan_id to NULL since they are no longer in the clan
    UPDATE public.tournament_participants tp
    SET clan_id = NULL
    FROM public.tournaments t
    WHERE tp.tournament_id = t.id
    AND tp.user_id = OLD.user_id -- Use OLD for deleted row
    AND tp.clan_id = OLD.clan_id -- Only remove if they were representing THIS clan
    AND t.status = 'Aberto';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on clan_members for DELETE
DROP TRIGGER IF EXISTS trigger_remove_tournament_clan_on_leave ON public.clan_members;

CREATE TRIGGER trigger_remove_tournament_clan_on_leave
AFTER DELETE ON public.clan_members
FOR EACH ROW
EXECUTE FUNCTION public.remove_tournament_clan_on_leave();
