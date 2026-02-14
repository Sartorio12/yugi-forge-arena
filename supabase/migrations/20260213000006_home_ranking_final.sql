-- Final Ranking View Fix for Home Page (After Clone)
-- Adds equipped_frame_url and proper official scoring formula

DROP VIEW IF EXISTS public.player_rankings_view;

CREATE VIEW public.player_rankings_view AS
SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    p.level,
    p.xp,
    p.equipped_frame_url, -- Necessary for Home widget
    c.tag AS clan_tag,
    COALESCE(sum(tp.total_wins_in_tournament), 0::bigint) AS total_wins,
    COALESCE(sum(tp.total_wins_in_tournament), 0::bigint) * 5 AS total_points
   FROM profiles p
     LEFT JOIN tournament_participants tp ON p.id = tp.user_id
     LEFT JOIN clan_members cm ON p.id = cm.user_id
     LEFT JOIN clans c ON cm.clan_id = c.id
  GROUP BY p.id, p.username, p.avatar_url, p.level, p.xp, p.equipped_frame_url, c.tag
 HAVING COALESCE(sum(tp.total_wins_in_tournament), 0::bigint) > 0
  ORDER BY (COALESCE(sum(tp.total_wins_in_tournament), 0::bigint) * 5) DESC, p.level DESC;

-- Restore API permissions
GRANT SELECT ON public.player_rankings_view TO anon, authenticated;
ALTER VIEW public.player_rankings_view OWNER TO postgres;
