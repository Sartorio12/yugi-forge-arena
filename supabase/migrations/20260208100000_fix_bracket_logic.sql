-- Fix Bracket Logic: Distribute BYEs and add Match Numbers
CREATE OR REPLACE FUNCTION public.generate_single_elimination_bracket(p_tournament_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_participants UUID[];
    v_count INTEGER;
    v_bracket_size INTEGER := 2;
    v_rounds INTEGER := 1;
    v_match_id BIGINT;
    v_next_match_ids BIGINT[];
    v_current_round_matches BIGINT[];
    v_i INTEGER;
    v_p1 UUID;
    v_p2 UUID;
    v_match_count_in_round INTEGER;
BEGIN
    -- 1. Get Participants (Shuffled)
    SELECT ARRAY(
        SELECT user_id 
        FROM tournament_participants 
        WHERE tournament_id = p_tournament_id 
        ORDER BY RANDOM()
    ) INTO v_participants;

    v_count := array_length(v_participants, 1);
    
    IF v_count < 2 THEN
        RAISE EXCEPTION 'Not enough participants to generate a bracket.';
    END IF;

    -- 2. Calculate Bracket Size (Next Power of 2)
    WHILE v_bracket_size < v_count LOOP
        v_bracket_size := v_bracket_size * 2;
        v_rounds := v_rounds + 1;
    END LOOP;

    -- 3. Clear existing matches for this tournament
    DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id;

    -- 4. Generate Matches from FINAL backwards
    
    -- Final
    INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, match_number)
    VALUES (p_tournament_id, 'Final', v_rounds, 1)
    RETURNING id INTO v_match_id;
    
    v_next_match_ids := ARRAY[v_match_id];

    -- Rounds N-1 down to 1
    FOR r IN REVERSE (v_rounds - 1)..1 LOOP
        v_current_round_matches := ARRAY[]::BIGINT[];
        v_match_count_in_round := array_length(v_next_match_ids, 1) * 2;
        
        FOR i IN 1..array_length(v_next_match_ids, 1) LOOP
            -- Match A (Next Slot 1)
            INSERT INTO public.tournament_matches (
                tournament_id, round_name, round_number, match_number, next_match_id, next_match_slot
            )
            VALUES (
                p_tournament_id, 
                CASE WHEN r = v_rounds - 1 THEN 'Semi-final' WHEN r = v_rounds - 2 THEN 'Quartas' ELSE 'Rodada ' || r END, 
                r, 
                (i * 2) - 1, 
                v_next_match_ids[i], 
                1
            )
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
            
            -- Match B (Next Slot 2)
            INSERT INTO public.tournament_matches (
                tournament_id, round_name, round_number, match_number, next_match_id, next_match_slot
            )
            VALUES (
                p_tournament_id, 
                CASE WHEN r = v_rounds - 1 THEN 'Semi-final' WHEN r = v_rounds - 2 THEN 'Quartas' ELSE 'Rodada ' || r END, 
                r, 
                i * 2, 
                v_next_match_ids[i], 
                2
            )
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
        END LOOP;
        
        v_next_match_ids := v_current_round_matches;
    END LOOP;

    -- 5. Fill Round 1 with Players (Balanced BYE distribution)
    -- v_next_match_ids holds Round 1 match IDs in order 1, 2, 3, 4...
    -- v_bracket_size/2 is the number of matches in Round 1
    
    FOR i IN 1..(v_bracket_size/2) LOOP
        v_match_id := v_next_match_ids[i];
        
        -- Player 1 (Matches 1..8 get players 1..8)
        IF i <= v_count THEN
            v_p1 := v_participants[i];
        ELSE
            v_p1 := NULL;
        END IF;

        -- Player 2 (Matches 1..8 get players 9..16)
        IF (i + v_bracket_size/2) <= v_count THEN
            v_p2 := v_participants[i + v_bracket_size/2];
        ELSE
            v_p2 := NULL;
        END IF;

        UPDATE public.tournament_matches
        SET player1_id = v_p1, player2_id = v_p2
        WHERE id = v_match_id;
        
        -- Auto-advance BYE
        IF v_p1 IS NOT NULL AND v_p2 IS NULL THEN
             UPDATE public.tournament_matches
             SET winner_id = v_p1
             WHERE id = v_match_id;
        END IF;
        -- If both NULL, winner stays NULL (match is empty)
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
