-- Drop the function first to allow return type change
DROP FUNCTION IF EXISTS public.get_clan_members(bigint);

-- Update get_clan_members to include equipped_frame_url
CREATE OR REPLACE FUNCTION public.get_clan_members(p_clan_id bigint)
 RETURNS TABLE(id uuid, username text, avatar_url text, role public.clan_role, clan_tag text, equipped_frame_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username,
        p.avatar_url,
        cm.role,
        c.tag AS clan_tag,
        p.equipped_frame_url
    FROM
        clan_members cm
    JOIN
        profiles p ON cm.user_id = p.id
    JOIN
        clans c ON cm.clan_id = c.id
    WHERE
        cm.clan_id = p_clan_id;
END;
$function$;
