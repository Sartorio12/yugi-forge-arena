-- 1. Function to automatically release decks when a tournament is soft-deleted
CREATE OR REPLACE FUNCTION public.release_decks_on_tournament_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- If the tournament is being soft-deleted (deleted_at changes from NULL to something)
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- Delete the links in tournament_decks, effectively unlocking the decks
        DELETE FROM public.tournament_decks WHERE tournament_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger on the tournaments table
DROP TRIGGER IF EXISTS trigger_release_decks_on_tournament_delete ON public.tournaments;

CREATE TRIGGER trigger_release_decks_on_tournament_delete
AFTER UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.release_decks_on_tournament_delete();

-- 3. IMMEDIATE CLEANUP (The Fix for current locked decks)

-- A. Remove links for tournaments that were Hard Deleted (don't exist in tournaments table anymore)
DELETE FROM public.tournament_decks
WHERE tournament_id NOT IN (SELECT id FROM public.tournaments);

-- B. Remove links for tournaments that were Soft Deleted (deleted_at is set)
DELETE FROM public.tournament_decks
WHERE tournament_id IN (SELECT id FROM public.tournaments WHERE deleted_at IS NOT NULL);
