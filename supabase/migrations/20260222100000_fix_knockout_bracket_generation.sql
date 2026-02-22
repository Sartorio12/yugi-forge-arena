-- Fix generate_knockout_from_groups to generate full bracket and link matches

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
    v_num_pairs INT; -- Number of matches in the first knockout round
    
    -- Variables for bracket generation
    v_bracket_size INTEGER; -- Smallest power of 2 >= v_num_pairs * 2
    v_rounds INTEGER;
    v_match_id BIGINT;
    v_next_match_ids BIGINT[];
    v_current_round_matches BIGINT[];
    r INTEGER;
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

    -- RBAC: Only super-admin or the organizer of this tournament can generate knockout brackets
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'super-admin' OR id = '80193776-6790-457c-906d-ed45ea16df9f')
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin, or the organizer of this tournament to generate knockout brackets.';
    END IF;

    -- 2. Pair Pot 1 vs Pot 2 with "Same Group" rule
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

    IF NOT v_all_paired THEN
        RAISE EXCEPTION 'Não foi possível gerar um pareamento válido que respeite a regra de grupos após 100 tentativas.';
    END IF;

    -- 3. Calculate Bracket Size for the full knockout stage
    -- The actual number of players in the first knockout round is v_num_pairs * 2.
    -- We need the smallest power of 2 that can contain all participants from this round.
    v_bracket_size := 2;
    v_rounds := 1;
    WHILE v_bracket_size < (v_num_pairs * 2) LOOP -- Multiply by 2 because v_num_pairs is number of matches, not players
        v_bracket_size := v_bracket_size * 2;
        v_rounds := v_rounds + 1;
    END LOOP;

    -- 4. Clear ALL existing matches for this tournament to ensure a clean bracket
    DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id;

    -- 5. Generate Matches from FINAL backwards (Round N down to Round 1)
    -- This creates the structure for Quarterfinals, Semifinals, Final, etc.
    -- The first knockout round from groups will be 'Round 1' (or appropriate named round)
    
    -- Start with the Final (1 match)
    INSERT INTO public.tournament_matches (tournament_id, round_name, round_number)
    VALUES (p_tournament_id, 'Final', v_rounds)
    RETURNING id INTO v_match_id;
    
    v_next_match_ids := ARRAY[v_match_id]; -- The final is the target for the Semi-Finals

    -- Loop backwards from Semis to Round 1 (the initial knockout round from groups)
    FOR r IN REVERSE (v_rounds - 1)..1 LOOP
        v_current_round_matches := ARRAY[]::BIGINT[];
        
        FOR i IN 1..array_length(v_next_match_ids, 1) LOOP
            -- Create 2 matches feeding into each match of the next round
            
            -- Match A (Feeds to Slot 1 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 
                    CASE 
                        WHEN r = 1 AND v_num_pairs = 16 THEN 'Oitavas de Final'
                        WHEN r = 1 AND v_num_pairs = 8 THEN 'Quartas de Final'
                        WHEN r = 1 AND v_num_pairs = 4 THEN 'Semifinal'
                        WHEN r = 1 AND v_num_pairs = 2 THEN 'Final' -- Should not happen for round 1
                        WHEN r = 2 AND v_num_pairs = 16 THEN 'Quartas de Final'
                        WHEN r = 2 AND v_num_pairs = 8 THEN 'Semifinal'
                        WHEN r = 3 AND v_num_pairs = 16 THEN 'Semifinal'
                        WHEN r = v_rounds THEN 'Final'
                        ELSE 'Rodada ' || r
                    END,
                    r, v_next_match_ids[i], 1)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
            
            -- Match B (Feeds to Slot 2 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 
                    CASE 
                        WHEN r = 1 AND v_num_pairs = 16 THEN 'Oitavas de Final'
                        WHEN r = 1 AND v_num_pairs = 8 THEN 'Quartas de Final'
                        WHEN r = 1 AND v_num_pairs = 4 THEN 'Semifinal'
                        WHEN r = 1 AND v_num_pairs = 2 THEN 'Final' -- Should not happen for round 1
                        WHEN r = 2 AND v_num_pairs = 16 THEN 'Quartas de Final'
                        WHEN r = 2 AND v_num_pairs = 8 THEN 'Semifinal'
                        WHEN r = 3 AND v_num_pairs = 16 THEN 'Semifinal'
                        WHEN r = v_rounds THEN 'Final'
                        ELSE 'Rodada ' || r
                    END,
                    r, v_next_match_ids[i], 2)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
        END LOOP;
        
        v_next_match_ids := v_current_round_matches;
    END LOOP;

    -- 6. Fill the first knockout round (Round 1) with Paired Players
    -- v_next_match_ids now holds the IDs of Round 1 matches (from the bracket generation)
    
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

        -- Update the already created Round 1 match with player IDs
        UPDATE public.tournament_matches
        SET player1_id = v_match_p1,
            player2_id = v_match_p2
        WHERE id = v_next_match_ids[v_idx]; -- Use the match ID generated for Round 1
    END LOOP;

    -- 7. Update tournament status/phase
    UPDATE public.tournaments
    SET current_phase = 'knockout_stage',
        allow_deck_updates = true 
    WHERE id = p_tournament_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
