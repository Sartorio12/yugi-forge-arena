-- Award the Blue-Eyes White Dragon Round frame to all currently registered users
INSERT INTO public.user_unlocked_frames (user_id, frame_url)
SELECT id, '/borders/random/blue_eyes_white_dragon_round.png'
FROM public.profiles
ON CONFLICT (user_id, frame_url) DO NOTHING;

-- Also update recalculate_player_level to ensure new users also get this "present" frame
-- (Optional but recommended for consistency)
CREATE OR REPLACE FUNCTION public.recalculate_player_level(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_xp INT;
  new_level INT;
  old_level INT;
  reward_frame_url TEXT;
BEGIN
  -- Get the user's current total XP and old level
  SELECT xp, level INTO current_xp, old_level 
  FROM public.profiles 
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_xp < 0 THEN
    current_xp := 0;
  END IF;

  new_level := floor(current_xp / 50) + 1;

  UPDATE public.profiles
  SET 
    level = new_level,
    xp = current_xp,
    updated_at = now()
  WHERE id = p_user_id;

  IF new_level > old_level THEN
    FOR reward_frame_url IN
      SELECT fr.frame_url
      FROM public.frame_rewards fr
      WHERE fr.level_required > old_level AND fr.level_required <= new_level
    LOOP
      INSERT INTO public.user_unlocked_frames (user_id, frame_url)
      VALUES (p_user_id, reward_frame_url)
      ON CONFLICT (user_id, frame_url) DO NOTHING;
    END LOOP;
  END IF;

  -- Ensure beginner frame is unlocked
  INSERT INTO public.user_unlocked_frames (user_id, frame_url)
  VALUES (p_user_id, '/borders/leveling/beginners_frame.png')
  ON CONFLICT (user_id, frame_url) DO NOTHING;

  -- Ensure Blue-Eyes White Dragon present is unlocked for everyone
  INSERT INTO public.user_unlocked_frames (user_id, frame_url)
  VALUES (p_user_id, '/borders/random/blue_eyes_white_dragon_round.png')
  ON CONFLICT (user_id, frame_url) DO NOTHING;
  
END;
$function$;

-- 3. Update handle_new_user to trigger the initial frame awarding
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  
  -- Award starter frames (Beginner + Blue-Eyes)
  PERFORM public.recalculate_player_level(new.id);
  
  RETURN new;
END;
$$;
