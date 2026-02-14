-- Final fix for rankings view after full clone
-- Includes equipped_frame_url and proper ordering

DROP VIEW IF EXISTS public.player_rankings_view;

CREATE VIEW public.player_rankings_view AS
SELECT 
    p.id as user_id, 
    p.username, 
    p.avatar_url, 
    p.level, 
    p.xp, 
    p.equipped_frame_url, 
    c.tag as clan_tag, 
    COALESCE(COUNT(m.id) FILTER (WHERE m.winner_id = p.id), 0) as total_wins, 
    (COALESCE(COUNT(m.id) FILTER (WHERE m.winner_id = p.id), 0) * 5) as total_points
FROM profiles p
LEFT JOIN clan_members cm ON p.id = cm.user_id
LEFT JOIN clans c ON cm.clan_id = c.id
LEFT JOIN tournament_matches m ON p.id = m.player1_id OR p.id = m.player2_id
GROUP BY p.id, c.tag
ORDER BY total_points DESC, p.level DESC;

-- Crucial: Grant select to the roles used by PostgREST
GRANT SELECT ON public.player_rankings_view TO anon, authenticated;

-- Ensure ownership
ALTER VIEW public.player_rankings_view OWNER TO postgres;
