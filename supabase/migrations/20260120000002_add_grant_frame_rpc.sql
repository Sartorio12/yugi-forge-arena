-- Migration to add grant_frame_to_users RPC

CREATE OR REPLACE FUNCTION public.grant_frame_to_users(
    p_user_ids UUID[],
    p_frame_url TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if the executor is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can grant frames.';
    END IF;

    -- Iterate through each user ID
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        -- Insert the frame into the user's unlocked frames, ignoring if it already exists
        INSERT INTO public.user_unlocked_frames (user_id, frame_url)
        VALUES (v_user_id, p_frame_url)
        ON CONFLICT (user_id, frame_url) DO NOTHING;
        
        -- Create a notification for the user
        INSERT INTO public.notifications (user_id, type, data, link)
        VALUES (
            v_user_id,
            'system_notification', -- We might need to add this type if it doesn't exist, or reuse another
            jsonb_build_object(
                'message', 'Você recebeu uma nova borda de perfil!',
                'frame_url', p_frame_url
            ),
            '/profile/' || v_user_id
        );
    END LOOP;
END;
$$;
