-- Fix rankings view and permissions for local Supabase instance

-- 1. Ensure public access to profiles (needed for the view)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
CREATE POLICY "Allow public read access" ON public.profiles FOR SELECT USING (true);

-- 2. Reconstruct the view with correct joins and columns
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

-- 3. Grant proper permissions to the API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.player_rankings_view TO anon, authenticated;

-- 4. Set owner to postgres (or anon if needed, but postgres + grant is cleaner)
ALTER VIEW public.player_rankings_view OWNER TO postgres;
