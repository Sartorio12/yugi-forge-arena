-- Update get_player_match_history to include is_wo
CREATE OR REPLACE FUNCTION get_player_match_history(p_user_id uuid)
RETURNS TABLE (
    match_id bigint,
    tournament_id bigint,
    tournament_title text,
    tournament_date date,
    round_name text,
    opponent_id uuid,
    opponent_name text,
    opponent_avatar text,
    result text, -- 'WIN' or 'LOSS'
    is_wo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as match_id,
        t.id as tournament_id,
        t.title as tournament_title,
        COALESCE(t.event_date::date, m.created_at::date) as tournament_date,
        m.round_name,
        -- Determine opponent (if p_user_id is p1, opp is p2, else p1)
        CASE WHEN m.player1_id = p_user_id THEN m.player2_id ELSE m.player1_id END as opponent_id,
        op.username as opponent_name,
        op.avatar_url as opponent_avatar,
        -- Determine result
        CASE WHEN m.winner_id = p_user_id THEN 'WIN'::text ELSE 'LOSS'::text END as result,
        m.is_wo
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    JOIN 
        public.profiles op ON op.id = (CASE WHEN m.player1_id = p_user_id THEN m.player2_id ELSE m.player1_id END)
    WHERE 
        m.player1_id = p_user_id OR m.player2_id = p_user_id
    ORDER BY 
        m.created_at DESC;
END;
$$;
