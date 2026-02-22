DO $$
DECLARE
    p_tournament_id BIGINT := 33;
    
    v_first_round_matches_ids BIGINT[];
    v_num_first_round_matches INTEGER; -- Should be 8 for Oitavas de Final
    
    v_bracket_size INTEGER; -- Smallest power of 2 that contains all participants from the first round. (e.g., 16 for 8 matches)
    v_rounds INTEGER; -- Total rounds in the knockout stage (e.g., 4 for 16-player bracket)

    v_match_id BIGINT;
    v_next_match_ids BIGINT[];
    v_current_round_matches BIGINT[];
    r INTEGER;
    i INTEGER; -- Loop counter
BEGIN
    -- 1. Identify existing 'Oitavas de Final' matches and determine bracket size
    SELECT ARRAY_AGG(id ORDER BY id)
    INTO v_first_round_matches_ids
    FROM public.tournament_matches
    WHERE tournament_id = p_tournament_id
      AND round_name = 'Oitavas de Final'
      AND round_number = 100; -- Assuming round_number 100 is indeed Oitavas de Final for this tournament

    v_num_first_round_matches := array_length(v_first_round_matches_ids, 1);
    
    IF v_num_first_round_matches IS NULL OR v_num_first_round_matches = 0 THEN
        RAISE EXCEPTION 'Nenhuma partida de Oitavas de Final encontrada para o Torneio %', p_tournament_id;
    END IF;

    -- Calculate bracket size and total rounds
    -- v_num_first_round_matches is 8 (for 16 players)
    v_bracket_size := 2 * v_num_first_round_matches; -- e.g., 2 * 8 = 16 for a 16-player bracket
    v_rounds := 0;
    WHILE (1 << v_rounds) < v_bracket_size LOOP -- (1 << v_rounds) is 2^v_rounds
        v_rounds := v_rounds + 1;
    END LOOP;
    -- v_rounds will be 4 for 16-player bracket (R16, QF, SF, Final)

    -- Ensure no existing Quarterfinals, Semifinals, or Final matches to avoid duplicates
    IF EXISTS (SELECT 1 FROM public.tournament_matches WHERE tournament_id = p_tournament_id AND round_number IN (101, 102, 103)) THEN
        RAISE EXCEPTION 'Já existem partidas de Quartas de Final, Semifinal ou Final para o Torneio %. Não podemos gerar novamente.', p_tournament_id;
    END IF;

    -- 2. Generate Matches from FINAL backwards (Round 103 (Final) down to Round 101 (Quarterfinals))
    -- The existing 'Oitavas de Final' matches will be considered 'Round 100'
    
    -- Start with the Final (1 match) - Round 103
    INSERT INTO public.tournament_matches (tournament_id, round_name, round_number)
    VALUES (p_tournament_id, 'Final', 103) -- Final Round number
    RETURNING id INTO v_match_id;
    
    v_next_match_ids := ARRAY[v_match_id]; -- The final is the target for the Semi-Finals

    -- Loop backwards from Semifinals (Round 102) to Quarterfinals (Round 101)
    FOR r IN REVERSE 102..101 LOOP -- Corrected loop range for Quarterfinals (101) and Semifinals (102)
        v_current_round_matches := ARRAY[]::BIGINT[];
        
        FOR i IN 1..array_length(v_next_match_ids, 1) LOOP
            -- Create 2 matches feeding into each match of the next round
            
            -- Match A (Feeds to Slot 1 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 
                    CASE 
                        WHEN r = 101 THEN 'Quartas de Final'
                        WHEN r = 102 THEN 'Semifinal'
                        ELSE 'Rodada ' || r 
                    END,
                    r, v_next_match_ids[i], 1)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
            
            -- Match B (Feeds to Slot 2 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 
                    CASE 
                        WHEN r = 101 THEN 'Quartas de Final'
                        WHEN r = 102 THEN 'Semifinal'
                        ELSE 'Rodada ' || r 
                    END,
                    r, v_next_match_ids[i], 2)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
        END LOOP;
        
        v_next_match_ids := v_current_round_matches;
    END LOOP;
    -- At this point, v_next_match_ids should contain the IDs of the newly created Quarterfinal matches (Round 101)

    -- 3. Link existing 'Oitavas de Final' matches to the newly created 'Quartas de Final' matches
    -- There are 8 'Oitavas de Final' matches that need to feed into 4 'Quartas de Final' matches.
    -- Assuming a sequential linking based on the ID order of the Oitavas de Final matches.

    FOR i IN 1..(v_num_first_round_matches/2) LOOP -- Loop 4 times for 4 Quarterfinal matches
        -- Link the (2*i - 1)-th Oitavas de Final match to the i-th Quarterfinal match, slot 1
        UPDATE public.tournament_matches
        SET next_match_id = v_next_match_ids[i],
            next_match_slot = 1
        WHERE id = v_first_round_matches_ids[2*i - 1];
        
        -- Link the (2*i)-th Oitavas de Final match to the i-th Quarterfinal match, slot 2
        UPDATE public.tournament_matches
        SET next_match_id = v_next_match_ids[i],
            next_match_slot = 2
        WHERE id = v_first_round_matches_ids[2*i];
    END LOOP;

    RAISE NOTICE 'Corrigido o chaveamento para o Torneio %. Geradas % partidas subsequentes e ligadas % partidas das Oitavas de Final.', 
                 p_tournament_id, 
                 (SELECT COUNT(*) FROM public.tournament_matches WHERE tournament_id = p_tournament_id AND round_number IN (101, 102, 103)),
                 v_num_first_round_matches;

END;
$$ LANGUAGE plpgsql;