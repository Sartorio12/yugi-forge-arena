-- Atualiza a função para buscar tanto no nome das cartas quanto no nome do deck
CREATE OR REPLACE FUNCTION get_decks_by_archetype(search_term TEXT)
RETURNS SETOF decks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT d.*
  FROM decks d
  WHERE d.is_private = false
  AND (
    -- Opção 1: O nome do deck contém o termo (ex: "Deck Dracotail")
    d.deck_name ILIKE '%' || search_term || '%'
    OR
    -- Opção 2: O deck contém pelo menos uma carta com o termo no nome
    EXISTS (
      SELECT 1
      FROM deck_cards dc
      JOIN cards c ON c.id = dc.card_id
      WHERE dc.deck_id = d.id
      AND c.name ILIKE '%' || search_term || '%'
    )
  )
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$$;
