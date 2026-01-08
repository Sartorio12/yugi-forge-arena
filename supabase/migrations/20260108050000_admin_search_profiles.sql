-- Drop first to allow signature change
DROP FUNCTION IF EXISTS public.search_profiles_for_admin(TEXT);

-- Create RPC to search profiles by username or clan tag for admin use
CREATE OR REPLACE FUNCTION public.search_profiles_for_admin(p_search_term TEXT)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  avatar_url TEXT,
  equipped_frame_url TEXT,
  clan_tag TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check permission
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'organizer') THEN
    RAISE EXCEPTION 'Only admins can use this search.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.username,
    p.avatar_url,
    p.equipped_frame_url,
    c.tag AS clan_tag
  FROM public.profiles p
  LEFT JOIN public.clan_members cm ON p.id = cm.user_id
  LEFT JOIN public.clans c ON cm.clan_id = c.id
  WHERE 
    p.username ILIKE '%' || p_search_term || '%'
    OR c.tag ILIKE '%' || p_search_term || '%'
  ORDER BY p.username ASC
  LIMIT 50;
END;
$function$;