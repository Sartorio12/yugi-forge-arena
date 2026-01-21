-- Function to find public decks containing cards matching a search term
CREATE OR REPLACE FUNCTION get_decks_by_archetype(search_term TEXT)
RETURNS SETOF decks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT d.*
  FROM decks d
  WHERE d.is_private = false
  AND EXISTS (
    SELECT 1
    FROM deck_cards dc
    JOIN cards c ON c.id = dc.card_id
    WHERE dc.deck_id = d.id
    -- ILIKE allows case-insensitive matching. 
    -- We match if the card name contains the search term.
    AND c.name ILIKE '%' || search_term || '%'
  )
  ORDER BY d.created_at DESC
  LIMIT 50; -- Limit to 50 results for performance
END;
$$;
