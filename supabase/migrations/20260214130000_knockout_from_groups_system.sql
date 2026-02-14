-- 20260214130000_knockout_from_groups_system.sql
-- Systems to transition from Groups to Knockout stage

-- 1. Add 'phase' and 'allow_deck_updates' to tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'group_stage',
ADD COLUMN IF NOT EXISTS allow_deck_updates BOOLEAN DEFAULT false;

-- Create a type for qualifiers to avoid record[] issues
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_qualifier') THEN
        CREATE TYPE public.group_qualifier AS (
            group_name TEXT,
            user_id UUID,
            pos INT
        );
    END IF;
END $$;

-- 2. Function to get qualifiers (1st and 2nd from each group)
CREATE OR REPLACE FUNCTION public.get_group_qualifiers(p_tournament_id BIGINT)
RETURNS TABLE (
    group_name TEXT,
    user_id UUID,
    pos INT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_participants AS (
        SELECT 
            gs.group_name,
            gs.user_id,
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
    SELECT 
        rp.group_name,
        rp.user_id,
        rp.ranking_pos::INT
    FROM ranked_participants rp
    WHERE rp.ranking_pos <= 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Robust function to generate knockout from groups with Pot logic and "Same Group" rule
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

    -- 3. If valid pairing found, insert into tournament_matches
    IF v_all_paired THEN
        v_p2_selected := '{}';
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
                round_number
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
                100 
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

-- 4. Update submit_deck_to_tournament to allow updates during transition
CREATE OR REPLACE FUNCTION public.submit_deck_to_tournament(p_tournament_id bigint, p_deck_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 AS $function$
declare
    v_user_id uuid := auth.uid();
    v_deck record;
    v_new_snapshot_id bigint;
    v_old_snapshot_id bigint;
    v_tournament_status text;
    v_allow_updates boolean;
    v_event_date timestamptz;
begin
    -- Get tournament details
    SELECT status, allow_deck_updates, event_date 
    INTO v_tournament_status, v_allow_updates, v_event_date
    FROM public.tournaments WHERE id = p_tournament_id;

    -- Check if decklist submission is closed
    if v_event_date <= now() AND NOT v_allow_updates then
        raise exception 'As inscrições de deck para este torneio estão fechadas.';
    end if;

    -- Check if user is enrolled
    if not exists (select 1 from public.tournament_participants where tournament_id = p_tournament_id and user_id = v_user_id) then
        raise exception 'Você não está inscrito neste torneio.';
    end if;

    -- If in transition phase, verify if user is actually a qualifier
    IF v_allow_updates AND v_event_date <= now() THEN
        IF NOT EXISTS (SELECT 1 FROM public.get_group_qualifiers(p_tournament_id) WHERE user_id = v_user_id) THEN
            RAISE EXCEPTION 'Apenas jogadores classificados podem atualizar seus decks para a próxima fase.';
        END IF;
    END IF;

    -- Get deck details
    select * into v_deck from public.decks where id = p_deck_id and user_id = v_user_id;
    if not found then
        raise exception 'Deck não encontrado ou você não é o dono deste deck.';
    end if;

    -- Create a new snapshot
    insert into public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys)
    values (p_tournament_id, v_user_id, v_deck.deck_name, v_deck.is_private, v_deck.is_genesys)
    returning id into v_new_snapshot_id;
    
    -- Copy deck cards to the snapshot
    insert into public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section)
    select v_new_snapshot_id, card_api_id, deck_section
    from public.deck_cards
    where deck_id = p_deck_id;

    -- Find old snapshot ID before upserting
    SELECT deck_snapshot_id into v_old_snapshot_id
    FROM public.tournament_decks
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id AND deck_id = p_deck_id;

    -- Link snapshot to the tournament_decks table
    insert into public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id)
    values (p_tournament_id, v_user_id, p_deck_id, v_new_snapshot_id)
    on conflict (tournament_id, user_id, deck_id) do update set deck_snapshot_id = v_new_snapshot_id;

    -- If there was an old snapshot, delete it
    if v_old_snapshot_id is not null then
        DELETE FROM public.tournament_deck_snapshot_cards WHERE snapshot_id = v_old_snapshot_id;
        delete from public.tournament_deck_snapshots where id = v_old_snapshot_id;
    end if;
    
end;
$function$;
