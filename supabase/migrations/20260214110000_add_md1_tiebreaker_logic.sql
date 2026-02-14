-- 1. Adicionar coluna para identificar partidas de desempate
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS is_tiebreaker BOOLEAN DEFAULT false;

-- 2. Dropar função antiga para mudar o tipo de retorno
DROP FUNCTION IF EXISTS public.get_tournament_group_standings(BIGINT);

-- 3. Atualizar a função de classificação para considerar vitórias de desempate como critério final
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
    game_difference BIGINT,
    tiebreaker_wins BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH participant_stats AS (
        SELECT 
            tp.user_id,
            tp.group_name,
            tp.is_disqualified,
            -- Matches Played (Excluindo desempates da contagem regular)
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE (tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id)
               AND tm.tournament_id = p_tournament_id
               AND tm.winner_id IS NOT NULL
               AND COALESCE(tm.is_tiebreaker, false) = false
            ) as matches_played,
            -- Wins (Apenas partidas regulares)
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
               AND COALESCE(tm.is_tiebreaker, false) = false
            ) as wins,
            -- Game Wins (GW) - Apenas partidas regulares
            (
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id AND COALESCE(is_tiebreaker, false) = false), 0) +
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id AND COALESCE(is_tiebreaker, false) = false), 0)
            ) as game_wins,
            -- Game Losses (GL) - Apenas partidas regulares
            (
                COALESCE((SELECT SUM(player2_score) FROM tournament_matches WHERE player1_id = tp.user_id AND tournament_id = p_tournament_id AND COALESCE(is_tiebreaker, false) = false), 0) +
                COALESCE((SELECT SUM(player1_score) FROM tournament_matches WHERE player2_id = tp.user_id AND tournament_id = p_tournament_id AND COALESCE(is_tiebreaker, false) = false), 0)
            ) as game_losses,
            -- Tiebreaker Wins (MD1 de desempate)
            (SELECT COUNT(*) 
             FROM tournament_matches tm 
             WHERE tm.winner_id = tp.user_id
               AND tm.tournament_id = p_tournament_id
               AND tm.is_tiebreaker = true
            ) as tiebreaker_wins
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
        (ps.game_wins - ps.game_losses) as game_difference,
        ps.tiebreaker_wins
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
        game_difference DESC,   -- Critério 2: Saldo de Sets
        wins DESC,              -- Critério 3: Vitórias
        tiebreaker_wins DESC,   -- Critério 4: Vitórias em MD1 de Desempate
        matches_played ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
