-- 1. Helper RPC to Setup the Duelist League Sweepstake (Admin)
CREATE OR REPLACE FUNCTION setup_duelist_league_sweepstake(
    p_title text,
    p_description text,
    p_deadline timestamp with time zone,
    p_d1_tournament_id bigint,
    p_d2_tournament_id bigint,
    p_d3_tournament_id bigint,
    p_d4_tournament_id bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sweepstake_id bigint;
BEGIN
    -- 1. Create the Sweepstake
    INSERT INTO public.sweepstakes (title, description, start_date, end_date, entry_fee)
    VALUES (p_title, p_description, now(), p_deadline, 5.00)
    RETURNING id INTO v_sweepstake_id;

    -- 2. Create the 4 Divisions with their specific points
    INSERT INTO public.sweepstake_divisions (sweepstake_id, tournament_id, division_name, points_reward)
    VALUES 
        (v_sweepstake_id, p_d1_tournament_id, 'Divisão 1', 10),
        (v_sweepstake_id, p_d2_tournament_id, 'Divisão 2', 15),
        (v_sweepstake_id, p_d3_tournament_id, 'Divisão 3', 20),
        (v_sweepstake_id, p_d4_tournament_id, 'Divisão 4', 25);

    RETURN v_sweepstake_id;
END;
$$;

-- 2. RPC to Submit a Bet (User)
-- p_picks is expected to be a JSON array: [{"division_id": 1, "winner_id": "uuid"}, ...]
CREATE OR REPLACE FUNCTION submit_sweepstake_bet(
    p_sweepstake_id bigint,
    p_picks jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_bet_id bigint;
    v_pick jsonb;
    v_deadline timestamp with time zone;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Check deadline
    SELECT end_date INTO v_deadline FROM public.sweepstakes WHERE id = p_sweepstake_id;
    IF now() > v_deadline THEN
        RAISE EXCEPTION 'Betting period has ended for this sweepstake';
    END IF;

    -- Create the main Bet record
    INSERT INTO public.sweepstake_bets (sweepstake_id, user_id, payment_status)
    VALUES (p_sweepstake_id, v_user_id, 'pending')
    RETURNING id INTO v_bet_id;

    -- Insert the 4 picks
    FOR v_pick IN SELECT * FROM jsonb_array_elements(p_picks)
    LOOP
        INSERT INTO public.sweepstake_picks (bet_id, division_id, predicted_winner_id)
        VALUES (
            v_bet_id, 
            (v_pick->>'division_id')::bigint, 
            (v_pick->>'winner_id')::uuid
        );
    END LOOP;

    RETURN v_bet_id;
END;
$$;

-- 3. RPC to calculate Ranking (Public)
CREATE OR REPLACE FUNCTION get_sweepstake_ranking(p_sweepstake_id bigint)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    total_points bigint,
    correct_picks_count bigint,
    bet_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH player_scores AS (
        SELECT 
            b.user_id,
            SUM(CASE WHEN p.predicted_winner_id = t.winner_id THEN d.points_reward ELSE 0 END) as points,
            COUNT(CASE WHEN p.predicted_winner_id = t.winner_id THEN 1 END) as correct_picks,
            b.created_at as bet_at
        FROM public.sweepstake_bets b
        JOIN public.sweepstake_picks p ON b.id = p.bet_id
        JOIN public.sweepstake_divisions d ON p.division_id = d.id
        LEFT JOIN public.tournaments t ON d.tournament_id = t.id
        WHERE b.sweepstake_id = p_sweepstake_id
          AND b.payment_status = 'paid'
        GROUP BY b.id, b.user_id, b.created_at
    )
    SELECT 
        ps.user_id,
        pr.username,
        pr.avatar_url,
        COALESCE(ps.points, 0)::bigint as total_points,
        COALESCE(ps.correct_picks, 0)::bigint as correct_picks_count,
        ps.bet_at as bet_date
    FROM player_scores ps
    JOIN public.profiles pr ON ps.user_id = pr.id
    ORDER BY total_points DESC, correct_picks_count DESC, bet_date ASC;
END;
$$;
