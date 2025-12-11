
-- Function to get the featured card of a deck
CREATE OR REPLACE FUNCTION get_featured_card_for_deck(p_deck_id BIGINT)
RETURNS TABLE (image_url_small TEXT, name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.image_url_small, c.name
    FROM public.deck_cards dc
    JOIN public.cards c ON dc.card_api_id = c.id
    WHERE dc.deck_id = p_deck_id
    ORDER BY
        CASE
            WHEN c.type LIKE '%Monster%' THEN 1 -- Prioritize monsters
            ELSE 2
        END,
        c.atk DESC NULLS LAST, -- Higher ATK monsters first
        c.def DESC NULLS LAST, -- Higher DEF monsters next
        c.name ASC -- Alphabetical if ATK/DEF are same
    LIMIT 1;
END;
$$;

-- Grant permissions to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION get_featured_card_for_deck(BIGINT) TO authenticated;
