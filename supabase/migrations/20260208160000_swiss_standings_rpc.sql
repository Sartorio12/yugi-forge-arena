-- Function to calculate Swiss Standings with Buchholz
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
    buchholz BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH player_scores AS (
        -- 1. Calculate basic scores for every participant
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
               AND tm.winner_id IS NOT NULL -- Only finished matches count for stats
            ) as matches_played,
            -- Wins
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as wins,
            -- Losses
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.winner_id IS NOT NULL 
               AND tm.winner_id <> tp.user_id
               AND tm.tournament_id = p_tournament_id
            ) as losses,
             -- Draws (assuming draw if winner_id is null but match is marked finished/scored - simplistic approach for now, usually wins*3)
             0::bigint as draws,
            -- Points: Win * 3 (Simplifying: Wins * 3. Draws not fully implemented in match reporter yet)
            ((SELECT COUNT(*) 
              FROM tournament_matches tm 
              WHERE tm.winner_id = tp.user_id
                AND tm.tournament_id = p_tournament_id
             ) * 3
            ) as points
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
        -- 2. Find all opponents for each player to calculate Buchholz
        SELECT 
            player_scores.user_id,
            CASE 
                WHEN tm.player1_id = player_scores.user_id THEN tm.player2_id 
                ELSE tm.player1_id 
            END as opponent_id
        FROM 
            player_scores
        JOIN 
            tournament_matches tm ON (tm.player1_id = player_scores.user_id OR tm.player2_id = player_scores.user_id)
        WHERE 
            tm.tournament_id = p_tournament_id
            AND tm.winner_id IS NOT NULL -- Only count played matches for Buchholz
            AND tm.is_wo = false -- Optional: Decide if WO counts for Buchholz. Usually yes, but the opponent score matters.
    )
    SELECT 
        ps.user_id,
        ps.username,
        ps.avatar_url,
        ps.clan_tag,
        ps.matches_played,
        ps.wins,
        ps.losses,
        ps.draws,
        ps.points,
        -- 3. Calculate Buchholz (Sum of opponents' points)
        COALESCE((
            SELECT SUM(opp_ps.points)
            FROM match_opponents mo
            JOIN player_scores opp_ps ON mo.opponent_id = opp_ps.user_id
            WHERE mo.user_id = ps.user_id
        ), 0)::bigint as buchholz
    FROM 
        player_scores ps
    ORDER BY 
        points DESC,
        buchholz DESC,
        wins DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
