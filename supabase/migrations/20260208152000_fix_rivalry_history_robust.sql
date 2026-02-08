-- Update get_rivalry_history to be more robust with dates and types
CREATE OR REPLACE FUNCTION get_rivalry_history(p_player1_id uuid, p_player2_id uuid)
RETURNS TABLE (
    id bigint,
    tournament_title text,
    tournament_date date,
    round_name text,
    winner_id uuid,
    winner_name text,
    winner_avatar text,
    is_wo boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        t.title as tournament_title,
        COALESCE(t.event_date::date, m.created_at::date) as tournament_date,
        m.round_name,
        m.winner_id,
        p.username as winner_name,
        p.avatar_url as winner_avatar,
        m.is_wo
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    LEFT JOIN 
        public.profiles p ON m.winner_id = p.id
    WHERE 
        ((m.player1_id = p_player1_id AND m.player2_id = p_player2_id)
        OR
        (m.player1_id = p_player2_id AND m.player2_id = p_player1_id))
        AND m.winner_id IS NOT NULL -- Apenas partidas finalizadas
    ORDER BY 
        m.created_at DESC;
END;
$$;
