CREATE OR REPLACE FUNCTION public.create_clan(
    name TEXT,
    tag TEXT,
    description TEXT,
    icon_url TEXT
)
RETURNS INT -- Return the new clan's ID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_clan_id INT;
    clan_owner_id UUID;
BEGIN
    -- Get the current user's ID
    clan_owner_id := auth.uid();

    -- Check if user is already in a clan
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = clan_owner_id) THEN
        RAISE EXCEPTION 'User is already in a clan.';
    END IF;

    -- Insert the new clan
    INSERT INTO public.clans (name, tag, description, icon_url, owner_id)
    VALUES (name, tag, description, icon_url, clan_owner_id)
    RETURNING id INTO new_clan_id;

    -- Insert the owner as the leader of the new clan
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (new_clan_id, clan_owner_id, 'LEADER');

    RETURN new_clan_id;
END;
$$;
