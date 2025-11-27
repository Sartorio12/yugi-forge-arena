-- Add image_url column to the clans table
ALTER TABLE public.clans
ADD COLUMN image_url TEXT;

-- Re-create or update the clan_rankings_view to include the new column.
-- This ensures the view is correct after the table has been altered.
-- It will either create the view if the previous migration failed,
-- or replace it if it was somehow created in a different state.
CREATE OR REPLACE VIEW public.clan_rankings_view AS
SELECT
    c.id AS clan_id,
    c.name AS clan_name,
    c.tag AS clan_tag,
    c.image_url AS clan_image_url, -- Now this column exists
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
    c.id, c.name, c.tag, c.image_url
ORDER BY
    total_clan_points DESC;
