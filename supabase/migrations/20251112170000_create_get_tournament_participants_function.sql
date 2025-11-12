CREATE OR REPLACE FUNCTION public.get_tournament_participants(p_tournament_id bigint)
RETURNS TABLE(
    id bigint,
    total_wins_in_tournament integer,
    deck_id bigint,
    deck_name text,
    profile_id uuid,
    profile_username text,
    profile_avatar_url text,
    clan_tag text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.id,
        tp.total_wins_in_tournament,
        tp.deck_id,
        d.deck_name,
        p.id as profile_id,
        p.username as profile_username,
        p.avatar_url as profile_avatar_url,
        c.tag as clan_tag
    FROM
        public.tournament_participants tp
    LEFT JOIN
        public.profiles p ON tp.user_id = p.id
    LEFT JOIN
        public.decks d ON tp.deck_id = d.id
    LEFT JOIN
        public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN
        public.clans c ON cm.clan_id = c.id
    WHERE
        tp.tournament_id = p_tournament_id;
END;
$$;