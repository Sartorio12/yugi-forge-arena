CREATE OR REPLACE FUNCTION public.get_deck_with_cards(p_deck_id bigint)
RETURNS TABLE (
    deck_id bigint,
    deck_name text,
    is_private boolean,
    is_genesys boolean,
    user_id uuid,
    card_id text,
    card_name text,
    card_type text,
    card_race text,
    card_attribute text,
    card_atk integer,
    card_def integer,
    card_level integer,
    card_image_url text,
    card_image_url_small text,
    card_ban_master_duel text,
    card_genesys_points integer,
    card_md_rarity text,
    deck_section text
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass complex joins RLS if needed, checking deck privacy manually
AS $$
DECLARE
    v_is_private boolean;
    v_deck_owner uuid;
    v_user_role text;
BEGIN
    -- 1. Get Deck Info & Privacy Check
    SELECT d.is_private, d.user_id INTO v_is_private, v_deck_owner
    FROM decks d
    WHERE d.id = p_deck_id;

    IF NOT FOUND THEN
        RETURN; -- Return empty if deck doesn't exist
    END IF;

    -- 2. Privacy Logic
    -- If deck is private AND requester is not owner AND requester is not admin, return empty
    -- Note: auth.uid() can be null for anon users
    IF v_is_private THEN
        IF auth.uid() IS NULL OR (auth.uid() <> v_deck_owner) THEN
            -- Check for admin role
            SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
            IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'organizer') THEN
                RETURN;
            END IF;
        END IF;
    END IF;

    -- 3. Return Data
    RETURN QUERY
    SELECT 
        d.id as deck_id,
        d.deck_name,
        d.is_private,
        d.is_genesys,
        d.user_id,
        c.id as card_id,
        c.name as card_name,
        c.type as card_type,
        c.race as card_race,
        c.attribute as card_attribute,
        c.atk as card_atk,
        c.def as card_def,
        c.level as card_level,
        c.image_url as card_image_url,
        c.image_url_small as card_image_url_small,
        c.ban_master_duel as card_ban_master_duel,
        c.genesys_points as card_genesys_points,
        c.md_rarity as card_md_rarity,
        dc.deck_section
    FROM deck_cards dc
    JOIN decks d ON dc.deck_id = d.id
    LEFT JOIN cards c ON dc.card_api_id = c.id
    WHERE d.id = p_deck_id;
END;
$$;
