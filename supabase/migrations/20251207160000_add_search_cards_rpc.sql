
CREATE OR REPLACE FUNCTION search_cards(
  search_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF cards AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM cards
  WHERE 
    name ILIKE '%' || search_query || '%' OR
    pt_name ILIKE '%' || search_query || '%'
  ORDER BY 
    CASE 
      WHEN name ILIKE search_query THEN 1 -- Exact match (top priority)
      WHEN name ILIKE search_query || '%' THEN 2 -- Starts with (high priority)
      WHEN pt_name ILIKE search_query THEN 3 -- Exact match PT
      WHEN pt_name ILIKE search_query || '%' THEN 4 -- Starts with PT
      ELSE 5 -- Contains
    END,
    LENGTH(name) ASC, -- Shorter names first (e.g., "Eva" before "Evaluation")
    name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
