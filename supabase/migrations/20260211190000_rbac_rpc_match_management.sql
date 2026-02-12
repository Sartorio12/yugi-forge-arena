-- Migration to add RBAC checks to match management RPC functions

-- Add RBAC to shuffle_tournament_groups
CREATE OR REPLACE FUNCTION public.shuffle_tournament_groups(
    p_tournament_id BIGINT,
    p_num_groups INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_participant_record RECORD;
    v_group_index INTEGER := 0;
    v_group_label TEXT;
BEGIN
    -- RBAC: Only super-admin or the organizer of this tournament can shuffle groups
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin or the organizer of this tournament to shuffle groups.';
    END IF;

    -- Reset current groups for this tournament
    UPDATE public.tournament_participants
    SET group_name = NULL
    WHERE tournament_id = p_tournament_id;

    -- Iterate through participants in random order
    FOR v_participant_record IN (
        SELECT id 
        FROM public.tournament_participants 
        WHERE tournament_id = p_tournament_id
        ORDER BY RANDOM()
    ) LOOP
        -- Calculate group label (Group A, Group B, Group C...)
        -- v_group_index % p_num_groups gives 0, 1, 2...
        v_group_label := 'Grupo ' || CHR(65 + (v_group_index % p_num_groups));
        
        UPDATE public.tournament_participants
        SET group_name = v_group_label
        WHERE id = v_participant_record.id;
        
        v_group_index := v_group_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add RBAC to reset_tournament_groups
CREATE OR REPLACE FUNCTION public.reset_tournament_groups(
    p_tournament_id BIGINT
)
RETURNS VOID AS $$
BEGIN
    -- RBAC: Only super-admin or the organizer of this tournament can reset groups
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin or the organizer of this tournament to reset groups.';
    END IF;

    UPDATE public.tournament_participants
    SET group_name = NULL
    WHERE tournament_id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add RBAC to generate_single_elimination_bracket
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
BEGIN
    -- RBAC: Only super-admin or the organizer of this tournament can generate brackets
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin or the organizer of this tournament to generate brackets.';
    END IF;

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

    -- 3. Clear existing matches for this tournament to avoid mess
    DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id;

    -- 4. Generate Matches from FINAL backwards (Round N down to Round 1)
    -- We store IDs of the "Next Round" matches to link them
    
    -- Start with the Final (1 match)
    -- Insert Final
    INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, match_number)
    VALUES (p_tournament_id, 'Final', v_rounds, 1)
    RETURNING id INTO v_match_id;
    
    v_next_match_ids := ARRAY[v_match_id]; -- The final is the target for the Semi-Finals

    -- Loop backwards from Semis to Round 1
    FOR r IN REVERSE (v_rounds - 1)..1 LOOP
        v_current_round_matches := ARRAY[]::BIGINT[];
        
        -- Number of matches in this round = 2^(v_rounds - r)
        -- e.g. If 3 rounds (8 people):
        -- R3 (Final): 1 match
        -- R2 (Semis): 2 matches
        -- R1 (Quarters): 4 matches
        
        FOR i IN 1..array_length(v_next_match_ids, 1) LOOP
            -- Create 2 matches feeding into each match of the next round
            
            -- Match A (Feeds to Slot 1 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 'Round ' || r, r, v_next_match_ids[i], 1)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
            
            -- Match B (Feeds to Slot 2 of Next Match)
            INSERT INTO public.tournament_matches (tournament_id, round_name, round_number, next_match_id, next_match_slot)
            VALUES (p_tournament_id, 'Round ' || r, r, v_next_match_ids[i], 2)
            RETURNING id INTO v_match_id;
            v_current_round_matches := array_append(v_current_round_matches, v_match_id);
        END LOOP;
        
        v_next_match_ids := v_current_round_matches;
    END LOOP;

    -- 5. Fill Round 1 with Players
    -- v_next_match_ids now holds the IDs of Round 1 matches (since we looped down to 1)
    -- We simply iterate and fill slots.
    
    FOR i IN 1..v_bracket_size/2 LOOP
        -- Get Match ID for this slot
        v_match_id := v_next_match_ids[i];
        
        -- Get Players (Handle BYEs if v_count < v_bracket_size)
        -- Logic: If index <= v_count, player exists. Else, BYE.
        -- Actually, standard BYE logic is complex.
        -- SIMPLIFIED LOGIC: Just fill sequentially. If player2 is null, Player 1 gets auto-win (handled manually or via UI).
        
        -- Player 1 (Index: 2*i - 1)
        IF (2*i - 1) <= v_count THEN
            v_p1 := v_participants[2*i - 1];
        ELSE
            v_p1 := NULL;
        END IF;

        -- Player 2 (Index: 2*i)
        IF (2*i) <= v_count THEN
            v_p2 := v_participants[2*i];
        ELSE
            v_p2 := NULL;
        END IF;

        UPDATE public.tournament_matches
        SET player1_id = v_p1, player2_id = v_p2
        WHERE id = v_match_id;
        
        -- Auto-advance BYE (If P1 exists and P2 is NULL, P1 wins immediately)
        IF v_p1 IS NOT NULL AND v_p2 IS NULL THEN
             UPDATE public.tournament_matches
             SET winner_id = v_p1
             WHERE id = v_match_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

