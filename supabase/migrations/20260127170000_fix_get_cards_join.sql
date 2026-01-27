CREATE OR REPLACE FUNCTION public.get_cards_for_deck(p_deck_id bigint)
RETURNS TABLE (
    card_api_id text,
    deck_section text,
    name text,
    pt_name text,
    type text,
    description text,
    race text,
    attribute text,
    atk integer,
    def integer,
    level integer,
    image_url text,
    image_url_small text,
    ban_tcg text,
    ban_ocg text,
    ban_master_duel text,
    genesys_points integer,
    md_rarity text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.card_api_id,
        dc.deck_section,
        c.name,
        c.pt_name,
        c.type,
        c.description,
        c.race,
        c.attribute,
        c.atk,
        c.def,
        c.level,
        c.image_url,
        c.image_url_small,
        c.ban_tcg,
        c.ban_ocg,
        c.ban_master_duel,
        c.genesys_points,
        c.md_rarity
    FROM deck_cards dc
    -- Use TRIM to ensure matching even if import had whitespace issues
    LEFT JOIN cards c ON TRIM(dc.card_api_id) = TRIM(c.id)
    WHERE dc.deck_id = p_deck_id;
END;
$$;
