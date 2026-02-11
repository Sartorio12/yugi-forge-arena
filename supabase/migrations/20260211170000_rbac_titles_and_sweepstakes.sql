-- Restrict Sweepstakes (Bolões) Management to Super-Admins

-- Re-define policies for the 'sweepstakes' table
DROP POLICY IF EXISTS "Admins can manage sweepstakes" ON public.sweepstakes;
CREATE POLICY "Allow super-admins to manage sweepstakes" ON public.sweepstakes
FOR ALL USING (get_user_role() = 'super-admin');

-- Re-define policies for the 'sweepstake_divisions' table
DROP POLICY IF EXISTS "Admins can manage divisions" ON public.sweepstake_divisions;
CREATE POLICY "Allow super-admins to manage sweepstake divisions" ON public.sweepstake_divisions
FOR ALL USING (get_user_role() = 'super-admin');

-- Re-define policies for the 'sweepstake_bets' table
DROP POLICY IF EXISTS "Admins see all bets" ON public.sweepstake_bets;
CREATE POLICY "Allow super-admins to see all bets" ON public.sweepstake_bets
FOR SELECT USING (get_user_role() = 'super-admin');

DROP POLICY IF EXISTS "Admins update bets" ON public.sweepstake_bets;
CREATE POLICY "Allow super-admins to update bets" ON public.sweepstake_bets
FOR UPDATE USING (get_user_role() = 'super-admin');

-- Re-define policies for the 'sweepstake_picks' table
DROP POLICY IF EXISTS "Admins see all picks" ON public.sweepstake_picks;
CREATE POLICY "Allow super-admins to see all picks" ON public.sweepstake_picks
FOR SELECT USING (get_user_role() = 'super-admin');


-- Restrict Title and Frame Distribution to Super-Admins

-- This function allows a super-admin to grant a specific title to a user.
CREATE OR REPLACE FUNCTION public.grant_title_to_user(p_user_id uuid, p_title_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    -- Security Check: Only super-admin can grant titles.
    IF get_user_role() != 'super-admin' THEN
        RAISE EXCEPTION 'Only super-admins can distribute titles.';
    END IF;

    INSERT INTO public.user_titles (user_id, title_id)
    VALUES (p_user_id, p_title_id)
    ON CONFLICT (user_id, title_id) DO NOTHING;
END;
$$;

-- This function allows a super-admin to grant a specific frame to a user.
CREATE OR REPLACE FUNCTION public.admin_grant_frame(p_user_id uuid, p_frame_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    -- Security Check: Only super-admin can grant frames.
    IF get_user_role() != 'super-admin' THEN
        RAISE EXCEPTION 'Only super-admins can grant frames.';
    END IF;

    INSERT INTO public.user_frames (user_id, frame_id)
    VALUES (p_user_id, p_frame_id)
    ON CONFLICT (user_id, frame_id) DO NOTHING;
END;
$$;
