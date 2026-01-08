CREATE OR REPLACE FUNCTION public.equip_frame(p_frame_url TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Allow equipping NULL (removing the frame) without checking unlocked frames
  IF p_frame_url IS NULL THEN
    UPDATE public.profiles
    SET equipped_frame_url = NULL
    WHERE id = auth.uid();
    RETURN;
  END IF;

  -- Check if the user has unlocked this frame
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_unlocked_frames uuf
    WHERE uuf.user_id = auth.uid() AND uuf.frame_url = p_frame_url
  ) THEN
    -- Also check for admin frames which are not in the rewards table
    IF p_frame_url NOT LIKE '/borders/adm/%' OR (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) NOT IN ('admin', 'organizer') THEN
      RAISE EXCEPTION 'You have not unlocked this frame.';
    END IF;
  END IF;

  -- Update the user's equipped frame
  UPDATE public.profiles
  SET equipped_frame_url = p_frame_url
  WHERE id = auth.uid();
END;
$function$;
