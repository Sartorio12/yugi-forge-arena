CREATE OR REPLACE FUNCTION public.register_with_bans(
    p_tournament_id BIGINT, 
    p_user_id UUID, 
    p_card_ids TEXT[],
    p_team_selection TEXT DEFAULT NULL
) 
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_conflicting_card TEXT;
BEGIN
    -- 1. Check if tournament exists and is open
    IF NOT EXISTS (SELECT 1 FROM tournaments WHERE id = p_tournament_id) THEN
        RAISE EXCEPTION 'Tournament not found';
    END IF;

    -- 2. Check if user is already enrolled
    IF EXISTS (SELECT 1 FROM tournament_participants WHERE tournament_id = p_tournament_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User already enrolled';
    END IF;

    -- 3. Check for conflicting bans (cards already banned by others)
    -- We select the first conflicting card found to report it
    SELECT card_id INTO v_conflicting_card
    FROM tournament_banned_cards
    WHERE tournament_id = p_tournament_id
      AND card_id = ANY(p_card_ids)
    LIMIT 1;

    IF v_conflicting_card IS NOT NULL THEN
        RAISE EXCEPTION 'Card % is already banned by another player.', v_conflicting_card;
    END IF;

    -- 4. Register user in participants
    INSERT INTO tournament_participants (tournament_id, user_id, team_selection)
    VALUES (p_tournament_id, p_user_id, p_team_selection);

    -- 5. Insert banned cards
    IF array_length(p_card_ids, 1) > 0 THEN
        INSERT INTO tournament_banned_cards (tournament_id, user_id, card_id)
        SELECT p_tournament_id, p_user_id, unnest(p_card_ids);
    END IF;
END;
$$;
