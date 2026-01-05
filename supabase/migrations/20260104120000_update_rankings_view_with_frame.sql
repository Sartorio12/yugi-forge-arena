-- Update the player_rankings_view to include the equipped_frame_url
DROP VIEW IF EXISTS public.player_rankings_view;
CREATE OR REPLACE VIEW public.player_rankings_view AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.level,
    p.xp,
    p.equipped_frame_url, -- Added equipped_frame_url
    c.tag AS clan_tag,
    COALESCE(sum(tp.total_wins_in_tournament), 0) AS total_wins,
    (COALESCE(sum(tp.total_wins_in_tournament), 0) * 5) AS total_points
FROM
    public.profiles p
    LEFT JOIN public.tournament_participants tp ON p.id = tp.user_id
    LEFT JOIN public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN public.clans c ON cm.clan_id = c.id
GROUP BY
    p.id, p.username, p.avatar_url, p.level, p.xp, p.equipped_frame_url, c.tag -- Add to GROUP BY
HAVING
    COALESCE(sum(tp.total_wins_in_tournament), 0) > 0 -- Filter out players with 0 wins
ORDER BY
    total_points DESC;