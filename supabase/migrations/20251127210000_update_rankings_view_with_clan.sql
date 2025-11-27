DROP VIEW IF EXISTS public.player_rankings_view;
CREATE OR REPLACE VIEW public.player_rankings_view AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.level,
    p.xp,
    c.tag AS clan_tag, -- Added clan_tag
    COALESCE(sum(tp.total_wins_in_tournament), 0) AS total_wins,
    (COALESCE(sum(tp.total_wins_in_tournament), 0) * 5) AS total_points
FROM
    public.profiles p
    LEFT JOIN public.tournament_participants tp ON p.id = tp.user_id
    LEFT JOIN public.clan_members cm ON p.id = cm.user_id -- Join to get clan membership
    LEFT JOIN public.clans c ON cm.clan_id = c.id      -- Join to get clan tag
GROUP BY
    p.id, p.username, p.avatar_url, p.level, p.xp, c.tag
ORDER BY
    total_points DESC;
