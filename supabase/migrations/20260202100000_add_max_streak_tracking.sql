-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_win_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_win_streak integer DEFAULT 0;

-- 2. Backfill Logic (Calculate historical streaks)
DO $$
DECLARE
    r RECORD;
    p_id uuid;
    cur_streak int;
    max_streak int;
    player_cursor CURSOR FOR SELECT id FROM public.profiles;
BEGIN
    -- For each player
    FOR player_record IN player_cursor LOOP
        p_id := player_record.id;
        cur_streak := 0;
        max_streak := 0;
        
        -- Loop through their matches ordered by time
        FOR r IN (
            SELECT winner_id, created_at 
            FROM public.tournament_matches 
            WHERE player1_id = p_id OR player2_id = p_id 
            ORDER BY created_at ASC
        ) LOOP
            IF r.winner_id = p_id THEN
                cur_streak := cur_streak + 1;
                IF cur_streak > max_streak THEN
                    max_streak := cur_streak;
                END IF;
            ELSE
                cur_streak := 0;
            END IF;
        END LOOP;

        -- Update the profile
        UPDATE public.profiles 
        SET current_win_streak = cur_streak,
            max_win_streak = max_streak
        WHERE id = p_id;
        
    END LOOP;
END $$;

-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION update_win_streaks_on_match()
RETURNS TRIGGER AS $$
DECLARE
    current_val int;
    p1_current int;
    p2_current int;
BEGIN
    -- Handle Winner
    UPDATE public.profiles
    SET current_win_streak = COALESCE(current_win_streak, 0) + 1
    WHERE id = NEW.winner_id
    RETURNING current_win_streak INTO current_val;

    -- Update Max if needed
    UPDATE public.profiles
    SET max_win_streak = GREATEST(COALESCE(max_win_streak, 0), current_val)
    WHERE id = NEW.winner_id;

    -- Handle Loser (Player 1)
    IF NEW.player1_id != NEW.winner_id THEN
        UPDATE public.profiles
        SET current_win_streak = 0
        WHERE id = NEW.player1_id;
    END IF;

    -- Handle Loser (Player 2)
    IF NEW.player2_id != NEW.winner_id THEN
        UPDATE public.profiles
        SET current_win_streak = 0
        WHERE id = NEW.player2_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trg_update_win_streaks ON public.tournament_matches;
CREATE TRIGGER trg_update_win_streaks
AFTER INSERT ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION update_win_streaks_on_match();

-- 5. Update RPC to show Max Streaks (Recordes)
CREATE OR REPLACE FUNCTION get_current_win_streaks(limit_count int DEFAULT 5)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    streak bigint -- We map max_win_streak to 'streak' to keep frontend compatibility
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.avatar_url,
        CAST(p.max_win_streak AS bigint) as streak
    FROM 
        public.profiles p
    WHERE 
        p.max_win_streak > 0
    ORDER BY 
        p.max_win_streak DESC,
        p.current_win_streak DESC -- Tiebreaker: who is currently hot?
    LIMIT limit_count;
END;
$$;
