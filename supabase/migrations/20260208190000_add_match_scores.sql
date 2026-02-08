-- 1. Add score columns to matches
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS player1_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_score INTEGER DEFAULT 0;

-- 2. Update Swiss Standings RPC to calculate Game Difference
CREATE OR REPLACE FUNCTION public.get_tournament_swiss_standings(p_tournament_id BIGINT)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    clan_tag TEXT,
    matches_played BIGINT,
    wins BIGINT,
    losses BIGINT,
    draws BIGINT,
    points BIGINT,
    buchholz BIGINT,
    game_difference BIGINT -- New Metric for Tiebreaker
) AS $$
BEGIN
    RETURN QUERY
    WITH player_stats AS (
        SELECT 
            tp.user_id,
            p.username,
            p.avatar_url,
            c.tag as clan_tag,
            -- Matches Played
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.tournament_id = p_tournament_id
               AND tm.winner_id IS NOT NULL
            ) as matches_played,
            -- Match Wins
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as wins,
            -- Match Losses
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.winner_id IS NOT NULL 
               AND tm.winner_id <> tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as losses,
            -- Match Points (Wins * 3)
            ((SELECT COUNT(*) 
              FROM tournament_matches tm 
              WHERE tm.winner_id = tp.user_id
                AND tm.tournament_id = p_tournament_id
             ) * 3
            ) as points,
            -- Game Wins (Sum of scores where player was p1 or p2)
            (
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id), 0) +
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id), 0)
            ) as games_won,
            -- Game Losses (Sum of scores where opponent scored)
            (
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id), 0) +
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id), 0)
            ) as games_lost
        FROM 
            tournament_participants tp
        JOIN 
            profiles p ON tp.user_id = p.id
        LEFT JOIN
            clan_members cm ON p.id = cm.user_id
        LEFT JOIN
            clans c ON cm.clan_id = c.id
        WHERE 
            tp.tournament_id = p_tournament_id
    ),
    match_opponents AS (
        SELECT 
            ps.user_id,
            CASE 
                WHEN tm.player1_id = ps.user_id THEN tm.player2_id 
                ELSE tm.player1_id 
            END as opponent_id
        FROM 
            player_stats ps
        JOIN 
            tournament_matches tm ON (tm.player1_id = ps.user_id OR tm.player2_id = ps.user_id)
        WHERE 
            tm.tournament_id = p_tournament_id
            AND tm.winner_id IS NOT NULL
            AND tm.is_wo = false
    )
    SELECT 
        ps.user_id,
        ps.username,
        ps.avatar_url,
        ps.clan_tag,
        ps.matches_played,
        ps.wins,
        ps.losses,
        0::bigint as draws,
        ps.points,
        -- Buchholz
        COALESCE((
            SELECT SUM(opp_ps.points)
            FROM match_opponents mo
            JOIN player_stats opp_ps ON mo.opponent_id = opp_ps.user_id
            WHERE mo.user_id = ps.user_id
        ), 0)::bigint as buchholz,
        -- Game Difference (Wins - Losses)
        (ps.games_won - ps.games_lost)::bigint as game_difference
    FROM 
        player_stats ps
    ORDER BY 
        points DESC,
        buchholz DESC,
        game_difference DESC, -- Tiebreaker #3
        wins DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
