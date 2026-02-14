-- Fix rankings view including the equipped_frame_url column after data restoration
-- This ensures the Home widget can correctly select the frame column

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
GROUP BY p.id, c.tag;

-- Grant permissions to the roles used by the API
GRANT SELECT ON public.player_rankings_view TO anon, authenticated;

-- Set ownership to postgres for consistent management
ALTER VIEW public.player_rankings_view OWNER TO postgres;
