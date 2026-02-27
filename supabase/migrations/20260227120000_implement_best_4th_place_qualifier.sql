
-- 20260227120000_implement_best_4th_place_qualifier.sql

-- Step 1: Update get_group_qualifiers to include the best 4th placed player for a 16-player bracket

CREATE OR REPLACE FUNCTION public.get_group_qualifiers(p_tournament_id BIGINT)
RETURNS TABLE (
    group_name TEXT,
    user_id UUID,
    pos INT
) AS $$
DECLARE
    v_qualifiers_per_group INT;
    v_total_qualifiers INT;
    v_num_groups INT;
    v_final_bracket_size INT;
    v_needed_best_finishers INT;
BEGIN
    -- Get tournament settings
    SELECT qualifiers_per_group INTO v_qualifiers_per_group
    FROM public.tournaments
    WHERE id = p_tournament_id;

    v_qualifiers_per_group := COALESCE(v_qualifiers_per_group, 2);

    SELECT count(DISTINCT group_name) INTO v_num_groups
    FROM public.get_tournament_group_standings(p_tournament_id);

    v_total_qualifiers := v_num_groups * v_qualifiers_per_group;

    -- Calculate the next power of 2 for the bracket size
    v_final_bracket_size := 2^ceil(log(2, v_total_qualifiers));
    
    -- If it's tournament 44, hard-override to 16, as requested
    IF p_tournament_id = 44 THEN
        v_final_bracket_size := 16;
    END IF;

    v_needed_best_finishers := v_final_bracket_size - v_total_qualifiers;

    -- Main query to get the qualifiers
    RETURN QUERY
    WITH ranked_participants AS (
        SELECT 
            gs.group_name,
            gs.user_id,
            gs.points,
            gs.game_difference,
            gs.wins,
            gs.matches_played,
            gs.is_disqualified,
            ROW_NUMBER() OVER (
                PARTITION BY gs.group_name 
                ORDER BY 
                    gs.is_disqualified ASC,
                    gs.points DESC,
                    gs.game_difference DESC,
                    gs.wins DESC,
                    gs.matches_played ASC
            ) as ranking_pos
        FROM public.get_tournament_group_standings(p_tournament_id) gs
    )
    -- Union of the top N from each group and the best M finishers
    (
        -- Top N from each group
        SELECT 
            rp.group_name,
            rp.user_id,
            rp.ranking_pos::INT
        FROM ranked_participants rp
        WHERE rp.ranking_pos <= v_qualifiers_per_group
    )
    UNION ALL
    (
        -- Best M finishers from the next position
        SELECT
            rp.group_name,
            rp.user_id,
            rp.ranking_pos::INT
        FROM ranked_participants rp
        WHERE rp.ranking_pos = (v_qualifiers_per_group + 1)
          AND rp.is_disqualified = false -- Can't qualify if disqualified
        ORDER BY
            rp.points DESC,
            rp.game_difference DESC,
            rp.wins DESC,
            rp.matches_played ASC
        LIMIT v_needed_best_finishers
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 2: Update generate_knockout_from_groups to handle a seeded 16-player bracket

CREATE OR REPLACE FUNCTION public.generate_knockout_from_groups(p_tournament_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_qualifiers public.group_qualifier[];
    v_seeded_qualifiers public.group_qualifier[];
    v_qualifier_record public.group_qualifier;
    v_bracket_size INT;
    i INT;
    v_round_name TEXT;
BEGIN
    -- 1. Get all qualifiers using the updated logic
    FOR v_qualifier_record IN SELECT * FROM public.get_group_qualifiers(p_tournament_id) LOOP
        v_qualifiers := array_append(v_qualifiers, v_qualifier_record);
    END LOOP;

    v_bracket_size := array_length(v_qualifiers, 1);

    -- Check if bracket size is a power of 2
    IF v_bracket_size <= 1 OR (v_bracket_size & (v_bracket_size - 1)) <> 0 THEN
        RAISE EXCEPTION 'O número de classificados (% não é uma potência de 2. Não é possível gerar o mata-mata.', v_bracket_size;
    END IF;
    
    -- 2. Seed the players
    -- This simple seeding places 1st places first, then 2nd, then 3rd, etc.
    -- and finally the best 4th player.
    FOR v_qualifier_record IN 
        SELECT * FROM public.get_group_qualifiers(p_tournament_id)
        ORDER BY pos ASC, random() -- Randomize within the same position to be fair
    LOOP
        v_seeded_qualifiers := array_append(v_seeded_qualifiers, v_qualifier_record);
    END LOOP;

    -- 3. Determine Round Name
    v_round_name := CASE v_bracket_size
        WHEN 64 THEN 'Rodada de 64'
        WHEN 32 THEN 'Rodada de 32'
        WHEN 16 THEN 'Oitavas de Final'
        WHEN 8 THEN 'Quartas de Final'
        WHEN 4 THEN 'Semifinal'
        WHEN 2 THEN 'Final'
        ELSE 'Mata-mata'
    END;

    -- 4. Create matches (1 vs 16, 2 vs 15, etc.)
    FOR i IN 1..(v_bracket_size / 2) LOOP
        INSERT INTO public.tournament_matches (
            tournament_id, 
            player1_id, 
            player2_id, 
            round_name, 
            round_number
        ) VALUES (
            p_tournament_id,
            (v_seeded_qualifiers[i]).user_id,
            (v_seeded_qualifiers[v_bracket_size - i + 1]).user_id,
            v_round_name,
            100 -- Standard round number for first knockout round
        );
    END LOOP;

    -- 5. Update tournament phase
    UPDATE public.tournaments
    SET current_phase = 'knockout_stage',
        allow_deck_updates = true 
    WHERE id = p_tournament_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Just in case, ensure tournament 44 is correctly set
UPDATE public.tournaments
SET qualifiers_per_group = 3
WHERE id = 44;
