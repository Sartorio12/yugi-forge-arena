-- Trigger function to update clan_id in tournament_participants when a user joins a clan
-- This ensures that if a user registers for a tournament and THEN joins a clan before the tournament starts,
-- their participation is correctly attributed to the new clan.

CREATE OR REPLACE FUNCTION public.update_tournament_clan_on_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Update participation records for OPEN tournaments ("Aberto")
    -- We join with the tournaments table to filter by status
    UPDATE public.tournament_participants tp
    SET clan_id = NEW.clan_id
    FROM public.tournaments t
    WHERE tp.tournament_id = t.id
    AND tp.user_id = NEW.user_id
    AND t.status = 'Aberto';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on clan_members
DROP TRIGGER IF EXISTS trigger_update_tournament_clan_on_join ON public.clan_members;

CREATE TRIGGER trigger_update_tournament_clan_on_join
AFTER INSERT ON public.clan_members
FOR EACH ROW
EXECUTE FUNCTION public.update_tournament_clan_on_join();
