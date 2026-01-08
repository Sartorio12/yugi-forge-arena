-- 1. Add text_color and background_color columns to user_titles
ALTER TABLE public.user_titles
ADD COLUMN text_color TEXT DEFAULT NULL,
ADD COLUMN background_color TEXT DEFAULT NULL;

-- 2. Update grant_title_to_users RPC to accept new colors
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
  END LOOP;
END;
$function$;

-- 3. Update equip_titles RPC to store new colors in JSONB
CREATE OR REPLACE FUNCTION public.equip_titles(p_titles TEXT[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  t text;
  t_record RECORD;
  new_equipped jsonb := '[]'::jsonb;
BEGIN
  -- 1. Validate number of titles
  IF array_length(p_titles, 1) > 3 THEN
    RAISE EXCEPTION 'You can only equip up to 3 titles.';
  END IF;

  -- 2. Validate and build JSONB
  IF p_titles IS NOT NULL THEN
    FOREACH t IN ARRAY p_titles
    LOOP
      SELECT border_color, text_color, background_color INTO t_record
      FROM public.user_titles 
      WHERE user_id = auth.uid() AND title = t;
      
      -- If not found, it means user doesn't own it
      IF NOT FOUND THEN
        RAISE EXCEPTION 'You do not own the title: %', t;
      END IF;
      
      -- Store all color info
      new_equipped := new_equipped || jsonb_build_object(
        'name', t, 
        'border_color', t_record.border_color,
        'text_color', t_record.text_color,
        'background_color', t_record.background_color,
        'color', t_record.border_color -- Keep 'color' alias for safety if used elsewhere as border color
      );
    END LOOP;
  END IF;

  -- 3. Update profile
  UPDATE public.profiles
  SET equipped_titles = new_equipped
  WHERE id = auth.uid();
END;
$function$;
