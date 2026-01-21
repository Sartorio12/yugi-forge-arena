-- Função para buscar decks que contenham cartas correspondentes a TODOS os termos fornecidos
-- Corrigido para usar card_api_id
CREATE OR REPLACE FUNCTION get_decks_with_all_terms(search_terms TEXT[])
RETURNS SETOF decks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT d.*
  FROM decks d
  WHERE d.is_private = false
  AND (
    SELECT count(*)
    FROM unnest(search_terms) AS term
    WHERE EXISTS (
        SELECT 1
        FROM deck_cards dc
        JOIN cards c ON c.id = dc.card_api_id -- Usa card_api_id para o join
        WHERE dc.deck_id = d.id
        AND c.name ILIKE '%' || term || '%'
    )
  ) = array_length(search_terms, 1)
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$$;