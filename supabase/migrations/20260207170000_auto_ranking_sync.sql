-- Trigger to automatically update participant wins when a match winner is set
CREATE OR REPLACE FUNCTION public.sync_participant_wins_from_matches()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. If a winner was set/changed
    IF (TG_OP = 'INSERT' AND NEW.winner_id IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.winner_id IS NOT NULL AND (OLD.winner_id IS NULL OR OLD.winner_id <> NEW.winner_id)) THEN
        
        -- Increment wins for the NEW winner
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = total_wins_in_tournament + 1
        WHERE tournament_id = NEW.tournament_id AND user_id = NEW.winner_id;
        
        -- If it was an update and there was a previous winner, decrement their wins (correction logic)
        IF TG_OP = 'UPDATE' AND OLD.winner_id IS NOT NULL AND OLD.winner_id <> NEW.winner_id THEN
            UPDATE public.tournament_participants
            SET total_wins_in_tournament = GREATEST(0, total_wins_in_tournament - 1)
            WHERE tournament_id = NEW.tournament_id AND user_id = OLD.winner_id;
        END IF;

    -- 2. If a winner was removed (set to NULL)
    ELSIF TG_OP = 'UPDATE' AND NEW.winner_id IS NULL AND OLD.winner_id IS NOT NULL THEN
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = GREATEST(0, total_wins_in_tournament - 1)
        WHERE tournament_id = OLD.tournament_id AND user_id = OLD.winner_id;
    
    -- 3. If a match with a winner is deleted
    ELSIF TG_OP = 'DELETE' AND OLD.winner_id IS NOT NULL THEN
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = GREATEST(0, total_wins_in_tournament - 1)
        WHERE tournament_id = OLD.tournament_id AND user_id = OLD.winner_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_sync_participant_wins ON public.tournament_matches;
CREATE TRIGGER trg_sync_participant_wins
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_matches
FOR EACH ROW EXECUTE FUNCTION public.sync_participant_wins_from_matches();
