-- 1. Power Ranking / Prediction for Tournament Winner
-- Fixed ambiguity by qualifying columns in the final SELECT
CREATE OR REPLACE FUNCTION get_tournament_power_rankings(p_tournament_id bigint)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    current_wins int,
    global_win_rate numeric,
    current_streak int,
    power_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH player_stats AS (
        SELECT
            tp.user_id,
            p.username,
            p.avatar_url,
            COALESCE(tp.total_wins_in_tournament, 0) as c_wins,
            COALESCE(p.current_win_streak, 0) as c_streak,
            -- Calculate Global Win Rate based on Match History (Rivalry System)
            (
                SELECT 
                    CASE WHEN count(*) = 0 THEN 0 
                    ELSE (SUM(CASE WHEN winner_id = tp.user_id THEN 1 ELSE 0 END)::numeric / count(*)) * 100 
                    END
                FROM tournament_matches tm
                WHERE tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id
            ) as g_rate
        FROM public.tournament_participants tp
        JOIN public.profiles p ON tp.user_id = p.id
        WHERE tp.tournament_id = p_tournament_id
    )
    SELECT
        player_stats.user_id,
        player_stats.username,
        player_stats.avatar_url,
        player_stats.c_wins,
        player_stats.g_rate,
        player_stats.c_streak,
        -- THE ALGORITHM:
        (100 + (player_stats.c_wins * 150) + (player_stats.g_rate * 5) + (player_stats.c_streak * 20))::numeric as power_score
    FROM player_stats
    ORDER BY power_score DESC;
END;
$$;

-- 2. Head-to-Head Simulator (The Oracle)
CREATE OR REPLACE FUNCTION simulate_matchup(p_player_a uuid, p_player_b uuid)
RETURNS TABLE (
    total_matches bigint,
    a_wins bigint,
    b_wins bigint,
    a_win_probability numeric,
    b_win_probability numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
    v_a_wins bigint;
    v_b_wins bigint;
    v_a_global_rate numeric;
    v_b_global_rate numeric;
BEGIN
    -- 1. Get Historical Matches (Direct Rivalry)
    SELECT 
        COUNT(*),
        SUM(CASE WHEN winner_id = p_player_a THEN 1 ELSE 0 END)
    INTO v_total, v_a_wins
    FROM public.tournament_matches
    WHERE (player1_id = p_player_a AND player2_id = p_player_b)
       OR (player1_id = p_player_b AND player2_id = p_player_a);

    v_b_wins := v_total - v_a_wins;

    -- 2. Get Global Stats (for fallback if no history)
    SELECT 
        (SELECT CASE WHEN count(*) = 0 THEN 50 ELSE (SUM(CASE WHEN winner_id = p_player_a THEN 1 ELSE 0 END)::numeric / count(*)) * 100 END 
         FROM tournament_matches WHERE player1_id = p_player_a OR player2_id = p_player_a),
        (SELECT CASE WHEN count(*) = 0 THEN 50 ELSE (SUM(CASE WHEN winner_id = p_player_b THEN 1 ELSE 0 END)::numeric / count(*)) * 100 END 
         FROM tournament_matches WHERE player1_id = p_player_b OR player2_id = p_player_b)
    INTO v_a_global_rate, v_b_global_rate;

    -- 3. Calculate Probability
    IF v_total >= 3 THEN
        a_win_probability := (v_a_wins::numeric / v_total::numeric) * 100;
    ELSE
        IF (v_a_global_rate + v_b_global_rate) = 0 THEN
            a_win_probability := 50;
        ELSE
            a_win_probability := (v_a_global_rate / (v_a_global_rate + v_b_global_rate)) * 100;
        END IF;
        
        IF v_total > 0 THEN
            a_win_probability := (a_win_probability * 0.7) + ((v_a_wins::numeric / v_total::numeric) * 100 * 0.3);
        END IF;
    END IF;

    b_win_probability := 100 - a_win_probability;
    
    RETURN QUERY SELECT v_total, v_a_wins, v_b_wins, a_win_probability, b_win_probability;
END;
$$;