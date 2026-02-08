-- Fix and Enhance Win Streak Logic
-- 1. Create a function to recalculate streaks for a specific user (or all if NULL)
CREATE OR REPLACE FUNCTION public.recalculate_player_streaks(p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    target_player RECORD;
    cur_streak INTEGER;
    max_streak INTEGER;
BEGIN
    FOR target_player IN 
        SELECT id FROM public.profiles 
        WHERE (p_user_id IS NULL OR id = p_user_id)
    LOOP
        cur_streak := 0;
        max_streak := 0;
        
        -- Scan all valid matches chronologically
        FOR r IN (
            SELECT m.winner_id 
            FROM public.tournament_matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            WHERE (m.player1_id = target_player.id OR m.player2_id = target_player.id)
            AND m.winner_id IS NOT NULL
            AND t.deleted_at IS NULL -- Ignore soft-deleted tournaments
            ORDER BY m.created_at ASC
        ) LOOP
            IF r.winner_id = target_player.id THEN
                cur_streak := cur_streak + 1;
                IF cur_streak > max_streak THEN
                    max_streak := cur_streak;
                END IF;
            ELSE
                cur_streak := 0;
            END IF;
        END LOOP;

        -- Update profile
        UPDATE public.profiles 
        SET current_win_streak = cur_streak,
            max_win_streak = max_streak
        WHERE id = target_player.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Improve the Trigger to handle updates and deletions intelligently
-- (Simpler approach: Just trigger a recalc for involved players on any change)
-- This ensures consistency even if matches are deleted or winners changed.
CREATE OR REPLACE FUNCTION public.trigger_recalc_streaks_on_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate for Player 1 (if exists)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.player1_id IS NOT NULL THEN
        PERFORM public.recalculate_player_streaks(NEW.player1_id);
    END IF;
    IF TG_OP = 'DELETE' AND OLD.player1_id IS NOT NULL THEN
        PERFORM public.recalculate_player_streaks(OLD.player1_id);
    END IF;

    -- Recalculate for Player 2 (if exists)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.player2_id IS NOT NULL THEN
        PERFORM public.recalculate_player_streaks(NEW.player2_id);
    END IF;
    IF TG_OP = 'DELETE' AND OLD.player2_id IS NOT NULL THEN
        PERFORM public.recalculate_player_streaks(OLD.player2_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace the old simple trigger with this robust one
DROP TRIGGER IF EXISTS trg_update_win_streaks ON public.tournament_matches;

CREATE TRIGGER trg_recalc_streaks_robust
AFTER INSERT OR UPDATE OR DELETE ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalc_streaks_on_change();
