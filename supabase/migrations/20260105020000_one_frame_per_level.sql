-- 1. Clear existing frame rewards
TRUNCATE TABLE public.frame_rewards;

-- 2. Insert new 1-per-level frame rewards
-- Following the user's requested order (mapping existing sequence to levels 1, 2, 3...)
INSERT INTO public.frame_rewards (level_required, frame_url) VALUES
(1, '/borders/leveling/beginners_frame.png'),
(2, '/borders/leveling/bronze_frame.png'),
(3, '/borders/leveling/silver_frame.png'),
(4, '/borders/leveling/gold_frame.png'),
(5, '/borders/leveling/platinum_frame.png'),
(6, '/borders/leveling/diamond_frame.png'),
(7, '/borders/leveling/master_frame.png'),
(8, '/borders/leveling/green_frame.png'),
(9, '/borders/leveling/mint_frame.png'),
(10, '/borders/leveling/orange_frame.png'),
(11, '/borders/leveling/red_frame.png'),
(12, '/borders/leveling/pink_frame.png'),
(13, '/borders/leveling/purple_frame.png'),
(14, '/borders/leveling/navy_frame.png'),
(15, '/borders/leveling/blue_frame.png'),
(16, '/borders/leveling/yellow_frame.png'),
(17, '/borders/leveling/yellow_lime.png'),
(18, '/borders/leveling/the_path_of_the_red_sky_striker.png'),
(19, '/borders/leveling/the_path_of_the_blue_sky_striker.png');

-- 3. Run backfill to award new frames to everyone based on their current level
-- This will ensure you (at level 6) get all frames from 1 to 6.
INSERT INTO public.user_unlocked_frames (user_id, frame_url)
SELECT p.id, fr.frame_url
FROM public.profiles p
JOIN public.frame_rewards fr ON p.level >= fr.level_required
ON CONFLICT (user_id, frame_url) DO NOTHING;
