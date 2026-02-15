-- Fix duplicate tournament decks and orphan snapshots
-- This migration ensures 1 deck per player in tournaments and cleans up old snapshots correctly.

BEGIN;

-- 1. Correct the unique constraint on tournament_decks
-- Currently it is (tournament_id, user_id, deck_id), which allows multiple different decks per player.
-- It should be (tournament_id, user_id) to ensure only ONE deck per player.

ALTER TABLE public.tournament_decks DROP CONSTRAINT IF EXISTS tournament_decks_tournament_id_user_id_deck_id_key;

-- Before adding the new constraint, we need to clean up existing duplicates if any.
-- Keep only the newest entry for each user in each tournament.
DELETE FROM public.tournament_decks a
USING public.tournament_decks b
WHERE a.id < b.id
  AND a.tournament_id = b.tournament_id
  AND a.user_id = b.user_id;

-- Add the new stricter constraint
ALTER TABLE public.tournament_decks ADD CONSTRAINT tournament_decks_tournament_id_user_id_key UNIQUE (tournament_id, user_id);

-- 2. Update the submit_deck_to_tournament RPC to handle switching decks correctly
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

    -- IMPORTANT: Find ANY existing snapshot for this user in this tournament
    -- regardless of whether it's the same deck_id or a different one.
    SELECT deck_snapshot_id into v_old_snapshot_id
    FROM public.tournament_decks
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

    -- Link snapshot to the tournament_decks table using the new unique constraint (tournament_id, user_id)
    insert into public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id)
    values (p_tournament_id, v_user_id, p_deck_id, v_new_snapshot_id)
    on conflict (tournament_id, user_id) 
    do update set 
        deck_id = EXCLUDED.deck_id, 
        deck_snapshot_id = EXCLUDED.deck_snapshot_id;

    -- If there was an old snapshot, delete it to keep database clean
    if v_old_snapshot_id is not null AND v_old_snapshot_id <> v_new_snapshot_id then
        DELETE FROM public.tournament_deck_snapshot_cards WHERE snapshot_id = v_old_snapshot_id;
        delete from public.tournament_deck_snapshots where id = v_old_snapshot_id;
    end if;
    
end;
$function$;

COMMIT;
