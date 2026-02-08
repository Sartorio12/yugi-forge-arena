-- 1. Add columns for Bracket logic to tournament_matches
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS next_match_id BIGINT REFERENCES public.tournament_matches(id),
ADD COLUMN IF NOT EXISTS next_match_slot INTEGER CHECK (next_match_slot IN (1, 2)), -- 1 = Player 1 slot, 2 = Player 2 slot
ADD COLUMN IF NOT EXISTS round_number INTEGER,
ADD COLUMN IF NOT EXISTS match_number INTEGER; -- Unique number within the tournament for ordering

-- 2. Trigger Function to auto-advance winners
CREATE OR REPLACE FUNCTION public.advance_bracket_winner()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if there is a winner and a next match defined
    IF NEW.winner_id IS NOT NULL AND NEW.next_match_id IS NOT NULL THEN
        IF NEW.next_match_slot = 1 THEN
            UPDATE public.tournament_matches
            SET player1_id = NEW.winner_id
            WHERE id = NEW.next_match_id;
        ELSIF NEW.next_match_slot = 2 THEN
            UPDATE public.tournament_matches
            SET player2_id = NEW.winner_id
            WHERE id = NEW.next_match_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trg_advance_bracket_winner ON public.tournament_matches;
CREATE TRIGGER trg_advance_bracket_winner
AFTER UPDATE OF winner_id ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION public.advance_bracket_winner();

-- 4. RPC to Generate Single Elimination Bracket
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
    -- 1. Get Participants (Shuffled)
    SELECT ARRAY(
        SELECT user_id 
        FROM tournament_participants 
        WHERE tournament_id = p_tournament_id 
        -- Optional: Add check_in filter if strict
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
