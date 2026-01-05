-- 1. Redefine recalculate_player_level with SECURITY DEFINER and better logic
CREATE OR REPLACE FUNCTION public.recalculate_player_level(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER -- Crucial to allow awarding frames without explicit user INSERT permissions
AS $function$
DECLARE
  current_xp INT;
  new_level INT;
  old_level INT;
  reward_frame_url TEXT;
BEGIN
  -- Get the user's current total XP and old level
  -- We use a row lock to prevent race conditions during level up
  SELECT xp, level INTO current_xp, old_level 
  FROM public.profiles 
  WHERE id = p_user_id
  FOR UPDATE;

  -- Ensure XP is not negative
  IF current_xp < 0 THEN
    current_xp := 0;
  END IF;

  -- Calculate the new level based on cumulative XP (50 XP per level)
  new_level := floor(current_xp / 50) + 1;

  -- Update the profile with the new level
  UPDATE public.profiles
  SET 
    level = new_level,
    xp = current_xp,
    updated_at = now()
  WHERE id = p_user_id;

  -- Award frames for ALL levels reached between old_level and new_level
  -- This handles cases where a user jumps multiple levels at once
  IF new_level > old_level THEN
    FOR reward_frame_url IN
      SELECT fr.frame_url
      FROM public.frame_rewards fr
      WHERE fr.level_required > old_level AND fr.level_required <= new_level
    LOOP
      -- Insert the new frame into the user's unlocked frames
      INSERT INTO public.user_unlocked_frames (user_id, frame_url)
      VALUES (p_user_id, reward_frame_url)
      ON CONFLICT (user_id, frame_url) DO NOTHING;
    END LOOP;
  END IF;

  -- Always ensure beginner frame is unlocked
  INSERT INTO public.user_unlocked_frames (user_id, frame_url)
  VALUES (p_user_id, '/borders/leveling/beginners_frame.png')
  ON CONFLICT (user_id, frame_url) DO NOTHING;
  
END;
$function$;

-- 2. Redefine check_level_up to be a wrapper for recalculate_player_level
-- This ensures all old code calling check_level_up now uses the new system and awards frames
CREATE OR REPLACE FUNCTION public.check_level_up(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM public.recalculate_player_level(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Run a final backfill to ensure anyone who reached levels recently gets their frames
INSERT INTO public.user_unlocked_frames (user_id, frame_url)
SELECT p.id, fr.frame_url
FROM public.profiles p
JOIN public.frame_rewards fr ON p.level >= fr.level_required
ON CONFLICT (user_id, frame_url) DO NOTHING;
