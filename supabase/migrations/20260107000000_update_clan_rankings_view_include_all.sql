-- Update clan_rankings_view to include ALL clans, even with 0 points
CREATE OR REPLACE VIEW public.clan_rankings_view AS
SELECT
    c.id AS clan_id,
    c.name AS clan_name,
    c.tag AS clan_tag,
    c.icon_url AS clan_image_url,
    COALESCE(SUM(pr.total_points), 0) AS total_clan_points
FROM
    public.clans c
LEFT JOIN
    public.clan_members cm ON c.id = cm.clan_id
LEFT JOIN
    public.player_rankings_view pr ON cm.user_id = pr.user_id
GROUP BY
    c.id, c.name, c.tag, c.icon_url
ORDER BY
    total_clan_points DESC;
