-- Update vote_for_poll RPC to prevent self-voting in user_selection polls
CREATE OR REPLACE FUNCTION vote_for_poll(
    p_poll_id bigint,
    p_candidate_id uuid DEFAULT NULL,
    p_option_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_current_votes int;
    v_max_votes int;
    v_poll_type text;
    v_expires_at timestamp with time zone;
    v_is_active boolean;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if poll exists, is active, and NOT expired
    SELECT max_votes_per_user, poll_type, expires_at, is_active 
    INTO v_max_votes, v_poll_type, v_expires_at, v_is_active
    FROM public.polls
    WHERE id = p_poll_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    IF v_is_active = false THEN
        RAISE EXCEPTION 'This poll is closed.';
    END IF;

    IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
        RAISE EXCEPTION 'This poll has expired.';
    END IF;

    -- Validate input based on type
    IF v_poll_type = 'user_selection' THEN
        IF p_candidate_id IS NULL THEN
            RAISE EXCEPTION 'Candidate ID required for user selection poll';
        END IF;

        -- Prevent self-voting
        IF p_candidate_id = v_user_id THEN
            RAISE EXCEPTION 'You cannot vote for yourself.';
        END IF;
    END IF;
    
    IF v_poll_type = 'custom' AND p_option_id IS NULL THEN
        RAISE EXCEPTION 'Option ID required for custom poll';
    END IF;

    -- Check vote count
    SELECT COUNT(*) INTO v_current_votes
    FROM public.poll_votes
    WHERE poll_id = p_poll_id AND user_id = v_user_id;
    
    IF v_current_votes >= v_max_votes THEN
        RAISE EXCEPTION 'You have reached the maximum number of votes for this poll';
    END IF;

    -- Check if already voted for this specific target
    IF EXISTS (
        SELECT 1 FROM public.poll_votes
        WHERE poll_id = p_poll_id 
        AND user_id = v_user_id
        AND (
            (candidate_id = p_candidate_id AND p_candidate_id IS NOT NULL) OR 
            (option_id = p_option_id AND p_option_id IS NOT NULL)
        )
    ) THEN
        RAISE EXCEPTION 'You have already voted for this option';
    END IF;

    -- Insert vote
    INSERT INTO public.poll_votes (poll_id, user_id, candidate_id, option_id)
    VALUES (p_poll_id, v_user_id, p_candidate_id, p_option_id);
END;
$$;
