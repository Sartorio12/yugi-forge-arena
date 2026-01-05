-- Backfill beginner frame for all existing users to ensure everyone has it.
INSERT INTO public.user_unlocked_frames (user_id, frame_url)
SELECT id, '/borders/leveling/beginners_frame.png'
FROM public.profiles
ON CONFLICT (user_id, frame_url) DO NOTHING;
