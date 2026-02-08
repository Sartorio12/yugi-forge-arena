-- Function to calculate group standings (World Cup Style)
CREATE OR REPLACE FUNCTION public.get_tournament_group_standings(p_tournament_id BIGINT)
RETURNS TABLE (
    group_name TEXT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    clan_tag TEXT,
    matches_played BIGINT,
    wins BIGINT,
    losses BIGINT,
    points BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH participant_stats AS (
        SELECT 
            tp.user_id,
            tp.group_name,
            -- Calculate Matches Played (Only finished matches where winner is set)
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.tournament_id = p_tournament_id
               AND tm.winner_id IS NOT NULL
            ) as matches_played,
            -- Calculate Wins
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as wins
        FROM 
            tournament_participants tp
        WHERE 
            tp.tournament_id = p_tournament_id
            AND tp.group_name IS NOT NULL
    )
    SELECT 
        ps.group_name,
        ps.user_id,
        p.username,
        p.avatar_url,
        c.tag as clan_tag,
        ps.matches_played,
        ps.wins,
        (ps.matches_played - ps.wins) as losses, -- Losses = Played - Wins (assuming no draws logic for now)
        (ps.wins * 3) as points -- 3 Points for a Win
    FROM 
        participant_stats ps
    JOIN 
        profiles p ON ps.user_id = p.id
    LEFT JOIN
        clan_members cm ON p.id = cm.user_id
    LEFT JOIN
        clans c ON cm.clan_id = c.id
    ORDER BY 
        ps.group_name ASC,
        points DESC, -- First tiebreaker: Points
        wins DESC,   -- Second tiebreaker: Wins
        matches_played ASC; -- Third tiebreaker: Less games played (better efficiency)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
