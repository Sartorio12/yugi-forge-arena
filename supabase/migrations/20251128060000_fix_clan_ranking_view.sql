-- Drop the view that depends on the incorrect column first
DROP VIEW IF EXISTS public.clan_rankings_view;

-- Now that the view is gone, we can safely drop the column
ALTER TABLE public.clans
DROP COLUMN IF EXISTS image_url;

-- Finally, re-create the view with the correct column name
CREATE OR REPLACE VIEW public.clan_rankings_view AS
SELECT
    c.id AS clan_id,
    c.name AS clan_name,
    c.tag AS clan_tag,
    c.icon_url AS clan_image_url,
    SUM(pr.total_points) AS total_clan_points
FROM
    public.clans c
JOIN
    public.clan_members cm ON c.id = cm.clan_id
JOIN
    public.player_rankings_view pr ON cm.user_id = pr.user_id
WHERE
    pr.total_points > 0
GROUP BY
    c.id, c.name, c.tag, c.icon_url
ORDER BY
    total_clan_points DESC;