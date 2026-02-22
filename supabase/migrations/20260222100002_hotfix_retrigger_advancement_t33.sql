DO $$
DECLARE
    p_tournament_id BIGINT := 33;
    v_match_record RECORD;
BEGIN
    -- Iterate through all 'Oitavas de Final' matches that have a winner
    FOR v_match_record IN
        SELECT id, winner_id
        FROM public.tournament_matches
        WHERE tournament_id = p_tournament_id
          AND round_name = 'Oitavas de Final'
          AND round_number = 100
          AND winner_id IS NOT NULL
    LOOP
        -- Perform a dummy update on winner_id to re-trigger trg_advance_bracket_winner
        UPDATE public.tournament_matches
        SET winner_id = v_match_record.winner_id -- Set to its current value
        WHERE id = v_match_record.id;
    END LOOP;

    RAISE NOTICE 'Reativado o avanço automático para vencedores das Oitavas de Final no Torneio %', p_tournament_id;

END;
$$ LANGUAGE plpgsql;