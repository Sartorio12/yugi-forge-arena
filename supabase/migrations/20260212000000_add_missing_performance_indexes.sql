-- Add missing indexes on frequently used foreign keys to improve performance
-- and reduce CPU/IO usage on Supabase.

-- Decks and Cards
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON public.deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON public.decks(created_at DESC);

-- Tournament Participation
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_tournament_id ON public.tournament_decks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_decks_user_id ON public.tournament_decks(user_id);

-- Comments and Likes (Social)
CREATE INDEX IF NOT EXISTS idx_news_comments_post_id ON public.news_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_deck_comments_deck_id ON public.deck_comments(deck_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_post_id ON public.news_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_deck_likes_deck_id ON public.deck_likes(deck_id);

-- Notifications (Accessed on almost every page load via the bell)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- Clan Members
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON public.clan_members(user_id);

-- Match History (Crucial for rankings and profile analytics)
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1_id ON public.tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2_id ON public.tournament_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON public.tournament_matches(tournament_id);
