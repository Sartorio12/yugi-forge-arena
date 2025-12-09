ALTER TABLE "public"."news_post_decks"
ADD COLUMN "deck_snapshot_id" bigint REFERENCES "public"."tournament_deck_snapshots"("id");

CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshots" FOR SELECT USING (true);

CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshot_cards" FOR SELECT USING (true);

-- Allow reading private decks/cards if they are featured in news
CREATE POLICY "Allow public read if featured in news" ON "public"."decks" FOR SELECT USING (
  id IN (SELECT deck_id FROM public.news_post_decks)
);

CREATE POLICY "Allow public read if featured in news" ON "public"."deck_cards" FOR SELECT USING (
  deck_id IN (SELECT deck_id FROM public.news_post_decks)
);
