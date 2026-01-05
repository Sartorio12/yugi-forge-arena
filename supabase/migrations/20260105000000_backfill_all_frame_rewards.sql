-- Backfill all frame rewards for existing users based on their current level
INSERT INTO public.user_unlocked_frames (user_id, frame_url)
SELECT p.id, fr.frame_url
FROM public.profiles p
JOIN public.frame_rewards fr ON p.level >= fr.level_required
ON CONFLICT (user_id, frame_url) DO NOTHING;
