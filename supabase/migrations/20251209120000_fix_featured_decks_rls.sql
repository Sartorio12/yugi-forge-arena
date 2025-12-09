
-- Allow reading private decks if they are featured in news
DROP POLICY IF EXISTS "Allow public read if featured in news" ON "public"."decks";
CREATE POLICY "Allow public read if featured in news" ON "public"."decks" FOR SELECT USING (
  id IN (SELECT deck_id FROM public.news_post_decks)
);

-- Allow reading deck cards if the deck is featured in news
DROP POLICY IF EXISTS "Allow public read if featured in news" ON "public"."deck_cards";
CREATE POLICY "Allow public read if featured in news" ON "public"."deck_cards" FOR SELECT USING (
  deck_id IN (SELECT deck_id FROM public.news_post_decks)
);

-- Ensure snapshot policies are present (in case previous migration was skipped/failed)
DROP POLICY IF EXISTS "Public read access" ON "public"."tournament_deck_snapshots";
CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshots" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON "public"."tournament_deck_snapshot_cards";
CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshot_cards" FOR SELECT USING (true);
