-- Create a view for profile stats that includes everyone (even with 0 wins)
CREATE OR REPLACE VIEW public.user_profile_stats AS
SELECT
    p.*,
    c.tag AS clan_tag,
    c.name AS clan_name,
    c.id AS clan_id,
    COALESCE(sum(tp.total_wins_in_tournament), 0) AS total_wins,
    (COALESCE(sum(tp.total_wins_in_tournament), 0) * 5) AS total_points
FROM
    public.profiles p
    LEFT JOIN public.tournament_participants tp ON p.id = tp.user_id
    LEFT JOIN public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN public.clans c ON cm.clan_id = c.id
GROUP BY
    p.id, c.tag, c.name, c.id;

GRANT SELECT ON public.user_profile_stats TO anon, authenticated, service_role;
