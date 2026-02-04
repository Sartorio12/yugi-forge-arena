-- RPC to get detailed poll votes for Admins
-- This allows seeing WHO voted for WHICH option
CREATE OR REPLACE FUNCTION get_poll_votes_admin(p_poll_id bigint)
RETURNS TABLE (
    voter_name text,
    vote_target text,
    voted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Strict Access Control: Only Admins and Organizers
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        voter.username as voter_name,
        COALESCE(candidate.username, option.label) as vote_target,
        v.created_at as voted_at
    FROM public.poll_votes v
    JOIN public.profiles voter ON v.user_id = voter.id
    LEFT JOIN public.profiles candidate ON v.candidate_id = candidate.id
    LEFT JOIN public.poll_options option ON v.option_id = option.id
    WHERE v.poll_id = p_poll_id
    ORDER BY v.created_at DESC;
END;
$$;
