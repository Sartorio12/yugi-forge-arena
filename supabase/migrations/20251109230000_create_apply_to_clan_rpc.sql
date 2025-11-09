CREATE OR REPLACE FUNCTION public.apply_to_clan(p_clan_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Check if user is already in any clan
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = current_user_id) THEN
        RAISE EXCEPTION 'You are already a member of a clan.';
    END IF;

    -- Check if user already has a pending application for this clan
    IF EXISTS (
        SELECT 1
        FROM public.clan_applications
        WHERE clan_id = p_clan_id AND user_id = current_user_id AND status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'You already have a pending application for this clan.';
    END IF;

    -- Insert the new application
    INSERT INTO public.clan_applications (clan_id, user_id, status)
    VALUES (p_clan_id, current_user_id, 'PENDING');
END;
$$;
