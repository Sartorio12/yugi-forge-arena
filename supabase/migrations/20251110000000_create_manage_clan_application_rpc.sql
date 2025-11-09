CREATE OR REPLACE FUNCTION public.manage_clan_application(
    p_application_id INT,
    p_new_status public.application_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clan_id INT;
    v_user_id UUID;
    v_current_status public.application_status;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Get application details
    SELECT clan_id, user_id, status
    INTO v_clan_id, v_user_id, v_current_status
    FROM public.clan_applications
    WHERE id = p_application_id;

    -- Check if the current user is the clan owner
    IF NOT EXISTS (
        SELECT 1
        FROM public.clans
        WHERE id = v_clan_id AND owner_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'Only the clan leader can manage applications.';
    END IF;

    -- Check if the application is still pending
    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'This application has already been processed.';
    END IF;

    -- Update the application status
    UPDATE public.clan_applications
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_application_id;

    -- If accepted, add the user to the clan members
    IF p_new_status = 'ACCEPTED' THEN
        -- Check if user is already in a clan (double check)
        IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_user_id) THEN
            RAISE EXCEPTION 'This user is already a member of a clan.';
        END IF;

        INSERT INTO public.clan_members (clan_id, user_id, role)
        VALUES (v_clan_id, v_user_id, 'MEMBER');
    END IF;
END;
$$;
