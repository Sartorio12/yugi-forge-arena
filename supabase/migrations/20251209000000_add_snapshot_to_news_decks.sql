ALTER TABLE "public"."news_post_decks"
ADD COLUMN "deck_snapshot_id" bigint REFERENCES "public"."tournament_deck_snapshots"("id");

CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshots" FOR SELECT USING (true);

CREATE POLICY "Public read access" ON "public"."tournament_deck_snapshot_cards" FOR SELECT USING (true);