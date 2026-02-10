-- 1. Add score columns if they don't exist
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS player1_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_score INTEGER DEFAULT 0;

-- 2. Zero out scores for Tournament 33 (Safe to run now)
UPDATE public.tournament_matches
SET player1_score = 0, player2_score = 0
WHERE tournament_id = 33;

-- 3. Re-apply the standings function with Game Difference
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
    points BIGINT,
    is_disqualified BOOLEAN,
    game_wins BIGINT,
    game_losses BIGINT,
    game_difference BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH participant_stats AS (
        SELECT 
            tp.user_id,
            tp.group_name,
            tp.is_disqualified,
            -- Matches Played
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.tournament_id = p_tournament_id
               AND tm.winner_id IS NOT NULL
            ) as matches_played,
            -- Wins
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as wins,
            -- Game Wins (GW)
            (
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id), 0) +
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id), 0)
            ) as game_wins,
            -- Game Losses (GL)
            (
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id), 0) +
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id), 0)
            ) as game_losses
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
        (ps.matches_played - ps.wins) as losses,
        (ps.wins * 3) as points,
        ps.is_disqualified,
        ps.game_wins,
        ps.game_losses,
        (ps.game_wins - ps.game_losses) as game_difference
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
        ps.is_disqualified ASC,
        points DESC,
        game_difference DESC,   -- Tiebreaker 2: Game Difference
        wins DESC,
        matches_played ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
