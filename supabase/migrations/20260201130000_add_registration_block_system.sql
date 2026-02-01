-- Add block system columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS consecutive_misses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocked_until timestamp with time zone;

-- Function to check block status on registration
CREATE OR REPLACE FUNCTION check_registration_block()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_blocked_until timestamp with time zone;
BEGIN
    SELECT blocked_until INTO v_blocked_until
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
        RAISE EXCEPTION 'Você está bloqueado de se inscrever em torneios até % devido a ausências consecutivas.', v_blocked_until;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to block registration
DROP TRIGGER IF EXISTS before_tournament_registration ON public.tournament_participants;
CREATE TRIGGER before_tournament_registration
BEFORE INSERT ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION check_registration_block();

-- Update perform_check_in to reset consecutive misses on success
CREATE OR REPLACE FUNCTION perform_check_in(p_tournament_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tournament_model text;
    v_event_date timestamp with time zone;
    v_status text;
BEGIN
    -- Get tournament details
    SELECT tournament_model, event_date, status
    INTO v_tournament_model, v_event_date, v_status
    FROM public.tournaments
    WHERE id = p_tournament_id;

    -- Validations
    IF v_tournament_model IS DISTINCT FROM 'Diário' THEN
        RAISE EXCEPTION 'Check-in is only available for Daily tournaments.';
    END IF;

    IF v_status <> 'Aberto' THEN
        RAISE EXCEPTION 'Tournament is not open for check-in.';
    END IF;

    -- Check time window (30 mins before start)
    IF now() < (v_event_date - interval '30 minutes') THEN
        RAISE EXCEPTION 'Check-in opens 30 minutes before the tournament starts.';
    END IF;

    -- Update the record
    UPDATE public.tournament_participants
    SET checked_in = true,
        checked_in_at = now()
    WHERE tournament_id = p_tournament_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User is not registered for this tournament.';
    END IF;

    -- Reset consecutive misses for the user as they attended
    UPDATE public.profiles
    SET consecutive_misses = 0
    WHERE id = p_user_id;
END;
$$;

-- Update remove_unchecked_participants to apply punishment
CREATE OR REPLACE FUNCTION remove_unchecked_participants(p_tournament_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_removed_count integer := 0;
    participant_record RECORD;
BEGIN
    -- Iterate over participants who haven't checked in
    FOR participant_record IN
        SELECT user_id
        FROM public.tournament_participants
        WHERE tournament_id = p_tournament_id
          AND checked_in = false
    LOOP
        -- Update profile: increment misses
        UPDATE public.profiles
        SET consecutive_misses = consecutive_misses + 1
        WHERE id = participant_record.user_id;

        -- Check if block needed (>= 3 misses)
        UPDATE public.profiles
        SET blocked_until = now() + interval '1 week',
            consecutive_misses = 0 -- Reset after blocking? Or keep it? Usually reset.
        WHERE id = participant_record.user_id
          AND consecutive_misses >= 3;

        v_removed_count := v_removed_count + 1;
    END LOOP;

    -- Now delete them
    DELETE FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id
      AND checked_in = false;

    RETURN v_removed_count;
END;
$$;
