-- Standardize Rivalry and Match History Logic
-- Goal: Exclude W.O.s from statistics and rivalry calculations as requested.

-- 1. Update get_top_rivalries (Main Widget)
-- Removed 2026 date filter, excluded W.O.s, and included equipped frames.
CREATE OR REPLACE FUNCTION get_top_rivalries(limit_count int DEFAULT 5)
RETURNS TABLE (
    player1_id uuid,
    player1_name text,
    player1_avatar text,
    player1_frame text,
    player2_id uuid,
    player2_name text,
    player2_avatar text,
    player2_frame text,
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
        p1.equipped_frame_url as p1_frame,
        CASE WHEN m.player1_id < m.player2_id THEN m.player2_id ELSE m.player1_id END as p2_id,
        p2.username as p2_name,
        p2.avatar_url as p2_avatar,
        p2.equipped_frame_url as p2_frame,
        COUNT(*) as match_count
    FROM 
        public.tournament_matches m
    JOIN 
        public.profiles p1 ON (CASE WHEN m.player1_id < m.player2_id THEN m.player1_id ELSE m.player2_id END) = p1.id
    JOIN 
        public.profiles p2 ON (CASE WHEN m.player1_id < m.player2_id THEN m.player2_id ELSE m.player1_id END) = p2.id
    WHERE 
        m.is_wo = false 
        AND m.winner_id IS NOT NULL
    GROUP BY 
        p1_id, p1_name, p1_avatar, p1.equipped_frame_url, p2_id, p2_name, p2_avatar, p2.equipped_frame_url
    ORDER BY 
        match_count DESC
    LIMIT limit_count;
END;
$$;

-- 2. Update get_rivalry_history (Head-to-Head Page)
-- Strictly exclude W.O.s from the comparison history.
CREATE OR REPLACE FUNCTION get_rivalry_history(p_player1_id uuid, p_player2_id uuid)
RETURNS TABLE (
    id bigint,
    tournament_title text,
    tournament_date date,
    round_name text,
    winner_id uuid,
    winner_name text,
    winner_avatar text,
    winner_frame text,
    winner_clan_tag text,
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
        p.equipped_frame_url as winner_frame,
        c.tag as winner_clan_tag,
        m.is_wo
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    LEFT JOIN 
        public.profiles p ON m.winner_id = p.id
    LEFT JOIN
        public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN
        public.clans c ON cm.clan_id = c.id
    WHERE 
        ((m.player1_id = p_player1_id AND m.player2_id = p_player2_id)
        OR
        (m.player1_id = p_player2_id AND m.player2_id = p_player1_id))
        AND m.winner_id IS NOT NULL 
        AND m.is_wo = false -- EXCLUDE W.O.s
    ORDER BY 
        m.created_at DESC;
END;
$$;

-- 3. Update get_player_match_history (Profile History)
-- Added opponent's frame for optimization.
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
    opponent_frame text,
    opponent_clan_tag text,
    result text,
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
        CASE WHEN m.player1_id = p_user_id THEN m.player2_id ELSE m.player1_id END as opponent_id,
        op.username as opponent_name,
        op.avatar_url as opponent_avatar,
        op.equipped_frame_url as opponent_frame,
        c.tag as opponent_clan_tag,
        CASE WHEN m.winner_id = p_user_id THEN 'WIN'::text ELSE 'LOSS'::text END as result,
        m.is_wo
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    JOIN 
        public.profiles op ON op.id = (CASE WHEN m.player1_id = p_user_id THEN m.player2_id ELSE m.player1_id END)
    LEFT JOIN
        public.clan_members cm ON op.id = cm.user_id
    LEFT JOIN
        public.clans c ON cm.clan_id = c.id
    WHERE 
        m.player1_id = p_user_id OR m.player2_id = p_user_id
    ORDER BY 
        m.created_at DESC;
END;
$$;
