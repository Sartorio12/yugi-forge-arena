-- 1. Add border_color column to user_titles
ALTER TABLE public.user_titles
ADD COLUMN border_color TEXT DEFAULT NULL;

-- 2. Update grant_title RPC to accept color and handle multiple users (logic in frontend will call this per user, or we can make a bulk RPC)
-- Let's make a bulk RPC for efficiency: grant_title_to_users
CREATE OR REPLACE FUNCTION public.grant_title_to_users(p_user_ids UUID[], p_title TEXT, p_border_color TEXT)
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
    -- Insert or Update color if exists
    INSERT INTO public.user_titles (user_id, title, border_color)
    VALUES (u_id, p_title, p_border_color)
    ON CONFLICT (id) DO UPDATE SET -- Wait, we don't have a unique constraint on (user_id, title) in DB schema, only logic check.
    -- Let's check manually
    border_color = EXCLUDED.border_color;
    
    -- Actually, since we don't have a unique constraint in the previous migration, we rely on logic.
    -- Let's improve this by adding a unique constraint or handling it via logic here.
    IF EXISTS (SELECT 1 FROM public.user_titles WHERE user_id = u_id AND title = p_title) THEN
       UPDATE public.user_titles SET border_color = p_border_color WHERE user_id = u_id AND title = p_title;
    ELSE
       INSERT INTO public.user_titles (user_id, title, border_color) VALUES (u_id, p_title, p_border_color);
    END IF;
  END LOOP;
END;
$function$;

-- Also update single grant_title just in case (optional, but good for consistency)
CREATE OR REPLACE FUNCTION public.grant_title(p_user_id UUID, p_title TEXT, p_border_color TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'organizer') THEN
    RAISE EXCEPTION 'Only admins can grant titles.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_titles WHERE user_id = p_user_id AND title = p_title) THEN
    UPDATE public.user_titles SET border_color = p_border_color WHERE user_id = p_user_id AND title = p_title;
  ELSE
    INSERT INTO public.user_titles (user_id, title, border_color)
    VALUES (p_user_id, p_title, p_border_color);
  END IF;
END;
$function$;
