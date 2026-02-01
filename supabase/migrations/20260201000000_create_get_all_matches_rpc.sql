-- RPC to get all matches for admin management
CREATE OR REPLACE FUNCTION get_all_matches(limit_count int DEFAULT 50, offset_count int DEFAULT 0)
RETURNS TABLE (
    id bigint,
    tournament_id bigint,
    tournament_title text,
    player1_id uuid,
    player1_name text,
    player2_id uuid,
    player2_name text,
    winner_id uuid,
    winner_name text,
    round_name text,
    created_at timestamp with time zone
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.tournament_id,
        t.title as tournament_title,
        m.player1_id,
        p1.username as player1_name,
        m.player2_id,
        p2.username as player2_name,
        m.winner_id,
        pw.username as winner_name,
        m.round_name,
        m.created_at
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    LEFT JOIN 
        public.profiles p1 ON m.player1_id = p1.id
    LEFT JOIN 
        public.profiles p2 ON m.player2_id = p2.id
    LEFT JOIN 
        public.profiles pw ON m.winner_id = pw.id
    ORDER BY 
        m.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;