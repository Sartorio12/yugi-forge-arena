-- 20260219100000_fix_knockout_round_number.sql
-- This migration updates the generate_knockout_from_groups function to use a more conventional round_number.

CREATE OR REPLACE FUNCTION public.generate_knockout_from_groups(p_tournament_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_pot1 public.group_qualifier[];
    v_pot2 public.group_qualifier[];
    v_qualifier public.group_qualifier;
    v_idx INT;
    v_p2_idx INT;
    v_match_p1 UUID;
    v_match_p2 UUID;
    v_p2_selected BOOLEAN[];
    v_attempts INT;
    v_all_paired BOOLEAN;
    v_num_pairs INT;
BEGIN
    -- 1. Collect Qualifiers into Pots
    FOR v_qualifier IN SELECT * FROM public.get_group_qualifiers(p_tournament_id) ORDER BY group_name ASC LOOP
        IF v_qualifier.pos = 1 THEN
            v_pot1 := array_append(v_pot1, v_qualifier);
        ELSE
            v_pot2 := array_append(v_pot2, v_qualifier);
        END IF;
    END LOOP;

    v_num_pairs := array_length(v_pot1, 1);
    
    IF v_num_pairs IS NULL OR v_num_pairs = 0 THEN
        RAISE EXCEPTION 'Não há qualificadores suficientes para gerar o mata-mata.';
    END IF;

    -- 2. Pair Pot 1 vs Pot 2 with "Same Group" rule
    -- Existing pairing logic ... (no change needed here)
    v_attempts := 0;
    LOOP
        v_attempts := v_attempts + 1;
        v_all_paired := true;
        
        -- Reset selections for this attempt
        v_p2_selected := '{}';
        FOR v_idx IN 1..v_num_pairs LOOP
            v_p2_selected[v_idx] := false;
        END LOOP;
        
        FOR v_idx IN 1..v_num_pairs LOOP
            v_match_p1 := (v_pot1[v_idx]).user_id;
            v_match_p2 := NULL;
            
            SELECT idx INTO v_p2_idx 
            FROM (
                SELECT i as idx, (v_pot2[i]).group_name as gname, v_p2_selected[i] as selected
                FROM generate_series(1, v_num_pairs) i
            ) sub
            WHERE sub.selected = false 
              AND sub.gname <> (v_pot1[v_idx]).group_name
            ORDER BY random()
            LIMIT 1;

            IF v_p2_idx IS NOT NULL THEN
                v_p2_selected[v_p2_idx] := true;
            ELSE
                v_all_paired := false;
                EXIT; -- Restart attempt
            END IF;
        END LOOP;

        IF v_all_paired OR v_attempts > 100 THEN
            EXIT;
        END IF;
    END LOOP;

    -- 3. If valid pairing found, insert into tournament_matches
    IF v_all_paired THEN
        -- Clear existing knockout matches (round_number = 1 for initial knockout round)
        -- Delete any matches with round_number = 1 (or corresponding initial knockout round number)
        DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id AND round_number = 1;

        v_p2_selected := '{}'; -- Reinitialize for actual insertion
        FOR v_idx IN 1..v_num_pairs LOOP
            v_p2_selected[v_idx] := false;
        END LOOP;

        FOR v_idx IN 1..v_num_pairs LOOP
            v_match_p1 := (v_pot1[v_idx]).user_id;
            
            SELECT idx INTO v_p2_idx 
            FROM (
                SELECT i as idx, (v_pot2[i]).group_name as gname, v_p2_selected[i] as selected
                FROM generate_series(1, v_num_pairs) i
            ) sub
            WHERE sub.selected = false 
              AND sub.gname <> (v_pot1[v_idx]).group_name
            ORDER BY random()
            LIMIT 1;

            v_p2_selected[v_p2_idx] := true;
            v_match_p2 := (v_pot2[v_p2_idx]).user_id;

            INSERT INTO public.tournament_matches (
                tournament_id, 
                player1_id, 
                player2_id, 
                round_name, 
                round_number -- Changed to 1 for initial knockout round
            ) VALUES (
                p_tournament_id,
                v_match_p1,
                v_match_p2,
                CASE 
                    WHEN v_num_pairs = 8 THEN 'Oitavas de Final'
                    WHEN v_num_pairs = 4 THEN 'Quartas de Final'
                    WHEN v_num_pairs = 2 THEN 'Semifinal'
                    ELSE 'Mata-mata'
                END,
                1  -- Set initial knockout round number to 1
            );
        END LOOP;

        -- Update tournament status/phase
        UPDATE public.tournaments
        SET current_phase = 'knockout_stage',
            allow_deck_updates = true 
        WHERE id = p_tournament_id;

    ELSE
        RAISE EXCEPTION 'Não foi possível gerar um pareamento válido que respeite a regra de grupos após 100 tentativas.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete old matches for tournament 33 that had round_number = 100.
-- IMPORTANT: This should only be executed once for existing data.
DELETE FROM public.tournament_matches WHERE tournament_id = 33 AND round_number = 100;
