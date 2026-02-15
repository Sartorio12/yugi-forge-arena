-- Function to get detailed picks for a specific bet
CREATE OR REPLACE FUNCTION public.get_sweepstake_bet_details(p_bet_id bigint)
RETURNS TABLE (
    division_id bigint,
    predicted_winner_id uuid,
    predicted_username text,
    predicted_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check permissions (super-admin, admin, or organizer)
    IF public.get_user_role() NOT IN ('super-admin', 'admin', 'organizer') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        sp.division_id,
        sp.predicted_winner_id,
        p.username as predicted_username,
        p.avatar_url as predicted_avatar_url
    FROM public.sweepstake_picks sp
    LEFT JOIN public.profiles p ON sp.predicted_winner_id = p.id
    WHERE sp.bet_id = p_bet_id;
END;
$$;
