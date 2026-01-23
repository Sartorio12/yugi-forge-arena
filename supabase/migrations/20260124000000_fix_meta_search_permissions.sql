-- Grant permissions for get_decks_with_all_terms
GRANT EXECUTE ON FUNCTION get_decks_with_all_terms(text[]) TO anon;
GRANT EXECUTE ON FUNCTION get_decks_with_all_terms(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_decks_with_all_terms(text[]) TO service_role;

-- Grant permissions for get_featured_card_for_deck to anon (was only authenticated)
GRANT EXECUTE ON FUNCTION get_featured_card_for_deck(bigint) TO anon;
-- (It is already granted to authenticated, but no harm ensuring it)
GRANT EXECUTE ON FUNCTION get_featured_card_for_deck(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_card_for_deck(bigint) TO service_role;
