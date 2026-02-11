-- Function to get current win streaks (Top 5)
CREATE OR REPLACE FUNCTION get_current_win_streaks(limit_count int DEFAULT 5)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    streak bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH OrderedMatches AS (
        SELECT 
            winner_id,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY winner_id ORDER BY created_at DESC) as rn_desc
        FROM public.tournament_matches
        WHERE created_at >= '2026-01-01'
    ),
    Losses AS (
         -- Find the last loss for each player to determine where the streak started
        SELECT 
            player1_id as player_id,
            created_at
        FROM public.tournament_matches
        WHERE winner_id != player1_id AND created_at >= '2026-01-01'
        UNION ALL
        SELECT 
            player2_id as player_id,
            created_at
        FROM public.tournament_matches
        WHERE winner_id != player2_id AND created_at >= '2026-01-01'
    ),
    LastLoss AS (
        SELECT 
            player_id,
            MAX(created_at) as last_loss_date
        FROM Losses
        GROUP BY player_id
    )
    SELECT 
        p.id as user_id,
        p.username,
        p.avatar_url,
        COUNT(m.id) as streak
    FROM 
        public.profiles p
    JOIN 
        public.tournament_matches m ON m.winner_id = p.id
    LEFT JOIN
        LastLoss l ON l.player_id = p.id
    WHERE 
        m.created_at >= '2026-01-01'
        AND (l.last_loss_date IS NULL OR m.created_at > l.last_loss_date)
    GROUP BY 
        p.id, p.username, p.avatar_url
    HAVING 
        COUNT(m.id) > 1 -- Only show streaks > 1
    ORDER BY 
        streak DESC
    LIMIT limit_count;
END;
$$;

-- Function to get top rivalries (Most played matchups)
CREATE OR REPLACE FUNCTION get_top_rivalries(limit_count int DEFAULT 5)
RETURNS TABLE (
    player1_id uuid,
    player1_name text,
    player1_avatar text,
    player2_id uuid,
    player2_name text,
    player2_avatar text,
    matches_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN m.player1_id < m.player2_id THEN m.player1_id ELSE m.player2_id END as p1_id,
        p1.username as p1_name,
        p1.avatar_url as p1_avatar,
        CASE WHEN m.player1_id < m.player2_id THEN m.player2_id ELSE m.player1_id END as p2_id,
        p2.username as p2_name,
        p2.avatar_url as p2_avatar,
        COUNT(*) as match_count
    FROM 
        public.tournament_matches m
    JOIN 
        public.profiles p1 ON (CASE WHEN m.player1_id < m.player2_id THEN m.player1_id ELSE m.player2_id END) = p1.id
    JOIN 
        public.profiles p2 ON (CASE WHEN m.player1_id < m.player2_id THEN m.player2_id ELSE m.player1_id END) = p2.id
    WHERE 
        m.created_at >= '2026-01-01' AND m.is_wo = false
    GROUP BY 
        p1_id, p1_name, p1_avatar, p2_id, p2_name, p2_avatar
    ORDER BY 
        match_count DESC
    LIMIT limit_count;
END;
$$;
