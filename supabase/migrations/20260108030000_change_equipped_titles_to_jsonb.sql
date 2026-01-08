-- 1. Reset column and change type to JSONB to store color info
-- We drop and add to ensure clean slate, as converting text[] to the desired jsonb structure is complex and unnecessary for empty/sparse data.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS equipped_titles;
ALTER TABLE public.profiles ADD COLUMN equipped_titles JSONB DEFAULT '[]'::jsonb;

-- 2. Update equip_titles RPC to look up colors and store them
CREATE OR REPLACE FUNCTION public.equip_titles(p_titles TEXT[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  t text;
  t_color text;
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
      SELECT border_color INTO t_color
      FROM public.user_titles 
      WHERE user_id = auth.uid() AND title = t;
      
      -- If not found, it means user doesn't own it
      IF t_color IS NULL AND NOT EXISTS (SELECT 1 FROM public.user_titles WHERE user_id = auth.uid() AND title = t) THEN
        RAISE EXCEPTION 'You do not own the title: %', t;
      END IF;
      
      -- Handle case where color is null (use default or leave null)
      -- We store it as is.
      new_equipped := new_equipped || jsonb_build_object('name', t, 'color', t_color);
    END LOOP;
  END IF;

  -- 3. Update profile
  UPDATE public.profiles
  SET equipped_titles = new_equipped
  WHERE id = auth.uid();
END;
$function$;
