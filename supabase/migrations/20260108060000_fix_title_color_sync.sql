-- 1. Helper function to refresh equipped titles (updates colors based on user_titles)
CREATE OR REPLACE FUNCTION public.refresh_user_equipped_titles(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_equipped jsonb;
  title_item jsonb;
  title_name text;
  t_record RECORD;
  new_equipped jsonb := '[]'::jsonb;
BEGIN
  -- Get current equipped titles
  SELECT equipped_titles INTO current_equipped FROM public.profiles WHERE id = p_user_id;
  
  IF current_equipped IS NULL OR jsonb_array_length(current_equipped) = 0 THEN
    RETURN; -- Nothing to update
  END IF;

  -- Iterate through current equipped titles
  FOR title_item IN SELECT * FROM jsonb_array_elements(current_equipped)
  LOOP
    -- Extract name (handle both string and object formats for safety)
    IF jsonb_typeof(title_item) = 'string' THEN
      title_name := title_item#>>'{}';
    ELSE
      title_name := title_item->>'name';
    END IF;

    -- Fetch fresh data from user_titles
    SELECT border_color, text_color, background_color INTO t_record
    FROM public.user_titles 
    WHERE user_id = p_user_id AND title = title_name;

    -- If title still exists in inventory, add it with fresh colors
    IF FOUND THEN
      new_equipped := new_equipped || jsonb_build_object(
        'name', title_name,
        'border_color', t_record.border_color,
        'text_color', t_record.text_color,
        'background_color', t_record.background_color,
        'color', t_record.border_color
      );
    END IF;
  END LOOP;

  -- Update profile
  UPDATE public.profiles
  SET equipped_titles = new_equipped
  WHERE id = p_user_id;
END;
$function$;

-- 2. Update grant_title_to_users to call refresh
CREATE OR REPLACE FUNCTION public.grant_title_to_users(
  p_user_ids UUID[], 
  p_title TEXT, 
  p_border_color TEXT,
  p_text_color TEXT,
  p_background_color TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  u_id UUID;
BEGIN
  -- Check permission
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'organizer') THEN
    RAISE EXCEPTION 'Only admins can grant titles.';
  END IF;

  FOREACH u_id IN ARRAY p_user_ids
  LOOP
    -- Insert or Update logic
    IF EXISTS (SELECT 1 FROM public.user_titles WHERE user_id = u_id AND title = p_title) THEN
       UPDATE public.user_titles 
       SET border_color = p_border_color,
           text_color = p_text_color,
           background_color = p_background_color
       WHERE user_id = u_id AND title = p_title;
    ELSE
       INSERT INTO public.user_titles (user_id, title, border_color, text_color, background_color) 
       VALUES (u_id, p_title, p_border_color, p_text_color, p_background_color);
    END IF;

    -- Refresh equipped titles to reflect changes immediately
    PERFORM public.refresh_user_equipped_titles(u_id);
  END LOOP;
END;
$function$;
