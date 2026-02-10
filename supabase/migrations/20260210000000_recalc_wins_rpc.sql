-- Recalculate wins for a tournament to ensure consistency
CREATE OR REPLACE FUNCTION public.recalc_tournament_wins(p_tournament_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- 1. Reset all wins to 0 for this tournament
    UPDATE public.tournament_participants
    SET total_wins_in_tournament = 0
    WHERE tournament_id = p_tournament_id;

    -- 2. Recalculate based on existing matches
    WITH win_counts AS (
        SELECT winner_id, COUNT(*) as win_count
        FROM public.tournament_matches
        WHERE tournament_id = p_tournament_id AND winner_id IS NOT NULL
        GROUP BY winner_id
    )
    UPDATE public.tournament_participants tp
    SET total_wins_in_tournament = wc.win_count
    FROM win_counts wc
    WHERE tp.tournament_id = p_tournament_id AND tp.user_id = wc.winner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
