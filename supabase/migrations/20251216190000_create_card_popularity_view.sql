CREATE OR REPLACE VIEW public.card_popularity AS
SELECT
  d.card_api_id,
  COUNT(d.id) AS popularity_score
FROM
  public.deck_cards d
GROUP BY
  d.card_api_id;