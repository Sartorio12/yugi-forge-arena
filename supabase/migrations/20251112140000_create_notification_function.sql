CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_id uuid,
    p_type public.notification_type,
    p_data jsonb,
    p_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_id uuid := auth.uid();
    actor_profile jsonb;
    notification_data jsonb;
BEGIN
    -- Don't notify the user about their own actions
    IF actor_id = p_recipient_id THEN
        RETURN;
    END IF;

    -- Get actor's profile
    SELECT jsonb_build_object('actor_username', username, 'actor_avatar_url', avatar_url)
    INTO actor_profile
    FROM public.profiles
    WHERE id = actor_id;

    -- Merge the actor profile with the provided data
    notification_data := actor_profile || p_data;

    -- Insert notification
    INSERT INTO public.notifications (user_id, type, data, link)
    VALUES (p_recipient_id, p_type, notification_data, p_link);
END;
$$;