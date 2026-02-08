CREATE OR REPLACE FUNCTION public.submit_deck_to_tournament(p_tournament_id bigint, p_deck_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_user_id uuid := auth.uid();
    v_deck record;
    v_new_snapshot_id bigint;
    v_old_submission record;
    v_num_decks_allowed integer;
begin
    -- Basic checks
    if exists (select 1 from tournaments where event_date <= now() and id = p_tournament_id) 
       and v_user_id != '80193776-6790-457c-906d-ed45ea16df9f'::uuid then
        raise exception 'Tournament has already started, decklist submission is closed.';
    end if;

    if not exists (select 1 from tournament_participants where tournament_id = p_tournament_id and user_id = v_user_id) then
        raise exception 'You are not enrolled in this tournament.';
    end if;

    select * into v_deck from decks where id = p_deck_id and user_id = v_user_id;
    if not found then
        raise exception 'Deck not found or you do not own this deck.';
    end if;

    -- Get tournament rules
    select num_decks_allowed into v_num_decks_allowed from public.tournaments where id = p_tournament_id;

    -- Create new snapshot
    insert into tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys)
    values (p_tournament_id, v_user_id, v_deck.deck_name, v_deck.is_private, v_deck.is_genesys)
    returning id into v_new_snapshot_id;
    
    insert into tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section)
    select v_new_snapshot_id, card_api_id, deck_section
    from public.deck_cards
    where deck_id = p_deck_id;

    if v_num_decks_allowed = 1 then
        -- For single-deck tournaments, find any existing submission to replace.
        SELECT * INTO v_old_submission
        FROM public.tournament_decks
        WHERE tournament_id = p_tournament_id AND user_id = v_user_id
        LIMIT 1;

        if v_old_submission is not null then
            -- Update the existing record to point to the new deck and snapshot
            UPDATE public.tournament_decks
            SET deck_id = p_deck_id, deck_snapshot_id = v_new_snapshot_id
            WHERE id = v_old_submission.id;

            -- CORRECTED LOGIC: 
            -- We only delete the old snapshot if it is NOT being used by any News Post.
            -- If it is used in a news post, we leave it alone so the history is preserved.
            IF NOT EXISTS (SELECT 1 FROM public.news_post_decks WHERE deck_snapshot_id = v_old_submission.deck_snapshot_id) THEN
                delete from tournament_deck_snapshots where id = v_old_submission.deck_snapshot_id;
            END IF;
            
        else
            -- No old submission, so insert a new one
            INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id)
            VALUES (p_tournament_id, v_user_id, p_deck_id, v_new_snapshot_id);
        end if;
    else
        -- For multi-deck tournaments, the old logic of inserting a new entry is preserved.
        -- A check against the limit should ideally be handled by the UI before calling this.
        INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id)
        VALUES (p_tournament_id, v_user_id, p_deck_id, v_new_snapshot_id)
        ON CONFLICT (tournament_id, user_id, deck_id) 
        DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
    end if;
end;
$function$
;