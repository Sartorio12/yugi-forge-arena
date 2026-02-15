-- Drop the old function first because we are changing the return type
DROP FUNCTION IF EXISTS public.get_tournament_banlist(p_tournament_id BIGINT);

-- Update get_tournament_banlist to return more fields for sorting
CREATE OR REPLACE FUNCTION public.get_tournament_banlist(p_tournament_id BIGINT)
RETURNS TABLE (
    card_id TEXT,
    name TEXT,
    image_url_small TEXT,
    type TEXT,
    race TEXT,
    attribute TEXT,
    level INTEGER,
    atk INTEGER,
    def INTEGER,
    count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tbc.card_id,
        c.name,
        c.image_url_small,
        c.type,
        c.race,
        c.attribute,
        c.level,
        c.atk,
        c.def,
        COUNT(tbc.card_id) as count
    FROM 
        tournament_banned_cards tbc
    JOIN 
        cards c ON tbc.card_id = c.id
    WHERE 
        tbc.tournament_id = p_tournament_id
    GROUP BY 
        tbc.card_id, c.name, c.image_url_small, c.type, c.race, c.attribute, c.level, c.atk, c.def
    ORDER BY 
        count DESC, c.name ASC;
END;
$$;
