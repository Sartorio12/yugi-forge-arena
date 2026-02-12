-- Fix Win Streak Logic by ordering matches by event_date
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
        
        -- Scan all valid matches chronologically by tournament event_date then match id
        FOR r IN (
            SELECT m.winner_id 
            FROM public.tournament_matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            WHERE (m.player1_id = target_player.id OR m.player2_id = target_player.id)
            AND m.winner_id IS NOT NULL
            AND t.deleted_at IS NULL -- Ignore soft-deleted tournaments
            ORDER BY t.event_date ASC, m.id ASC
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

-- One-time global recalculation to fix missing/broken streaks
-- SELECT public.recalculate_player_streaks(NULL);
