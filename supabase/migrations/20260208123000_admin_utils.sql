-- Utility function for Super Admin to force update a tournament snapshot
-- This is useful when a player needs a deck correction after the tournament has started.

CREATE OR REPLACE FUNCTION public.admin_force_update_snapshot(p_tournament_id bigint, p_user_id uuid, p_deck_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    v_deck record;
    v_new_snapshot_id bigint;
    v_old_submission record;
begin
    -- Verify caller is super admin (Hardcoded for security as requested)
    IF auth.uid() != '80193776-6790-457c-906d-ed45ea16df9f'::uuid THEN
        RAISE EXCEPTION 'Access denied. Super Admin only.';
    END IF;

    -- Get deck details
    select * into v_deck from decks where id = p_deck_id;
    if not found then
        raise exception 'Deck not found.';
    end if;

    -- Create new snapshot
    insert into tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys)
    values (p_tournament_id, p_user_id, v_deck.deck_name, v_deck.is_private, v_deck.is_genesys)
    returning id into v_new_snapshot_id;
    
    insert into tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section)
    select v_new_snapshot_id, card_api_id, deck_section
    from public.deck_cards
    where deck_id = p_deck_id;

    -- Update tournament_decks
    -- Check if entry exists for this specific deck and user in the tournament
    SELECT * INTO v_old_submission
    FROM public.tournament_decks
    WHERE tournament_id = p_tournament_id AND user_id = p_user_id AND deck_id = p_deck_id;

    IF v_old_submission IS NOT NULL THEN
        UPDATE public.tournament_decks
        SET deck_snapshot_id = v_new_snapshot_id
        WHERE id = v_old_submission.id;
        
        -- Cleanup old snapshot if not used in news
        IF NOT EXISTS (SELECT 1 FROM public.news_post_decks WHERE deck_snapshot_id = v_old_submission.deck_snapshot_id) THEN
            delete from tournament_deck_snapshots where id = v_old_submission.deck_snapshot_id;
        END IF;
    ELSE
         -- If for some reason it doesn't exist, insert it (Force Add)
         INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id)
         VALUES (p_tournament_id, p_user_id, p_deck_id, v_new_snapshot_id);
    END IF;
end;
$function$;
