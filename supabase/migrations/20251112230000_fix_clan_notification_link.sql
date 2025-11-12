CREATE OR REPLACE FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_clan_id INT;
    v_user_id UUID;
    v_current_status public.application_status;
    current_user_id UUID;
    v_new_member_username TEXT;
    v_clan_name TEXT;
BEGIN
    current_user_id := auth.uid();

    -- Get application details
    SELECT clan_id, user_id, status
    INTO v_clan_id, v_user_id, v_current_status
    FROM public.clan_applications
    WHERE id = p_application_id;

    -- Check if the current user is the clan owner or has a 'strategist' role
    IF NOT EXISTS (
        SELECT 1
        FROM public.clan_members
        WHERE clan_id = v_clan_id AND user_id = current_user_id AND role IN ('LEADER', 'STRATEGIST')
    ) THEN
        RAISE EXCEPTION 'Only clan leaders or strategists can manage applications.';
    END IF;

    -- Check if the application is still pending
    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'This application has already been processed.';
    END IF;

    -- Update the application status
    UPDATE public.clan_applications
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_application_id;

    -- If accepted, add the user to the clan members and create notifications
    IF p_new_status = 'ACCEPTED' THEN
        -- Check if user is already in a clan (double check)
        IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_user_id) THEN
            RAISE EXCEPTION 'This user is already a member of a clan.';
        END IF;

        INSERT INTO public.clan_members (clan_id, user_id, role)
        VALUES (v_clan_id, v_user_id, 'MEMBER');

        -- Get data for notification
        SELECT username INTO v_new_member_username FROM public.profiles WHERE id = v_user_id;
        SELECT name INTO v_clan_name FROM public.clans WHERE id = v_clan_id;

        -- Notify all existing clan members (including the leader who accepted)
        INSERT INTO public.notifications (user_id, type, data, link)
        SELECT
            cm.user_id,
            'new_clan_member'::public.notification_type,
            jsonb_build_object(
                'new_member_username', v_new_member_username,
                'clan_name', v_clan_name
            ),
            '/clans/' || v_clan_id -- Corrected link here!
        FROM
            public.clan_members cm
        WHERE
            cm.clan_id = v_clan_id
            AND cm.user_id != v_user_id; -- Don't notify the new member themselves

    END IF;
END;
$$;