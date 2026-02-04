-- Add check-in columns to tournament_participants
ALTER TABLE public.tournament_participants 
ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at timestamp with time zone;

-- RPC to perform check-in
DROP FUNCTION IF EXISTS perform_check_in(bigint, uuid);
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
END;
$$;

-- RPC to remove unchecked participants
DROP FUNCTION IF EXISTS remove_unchecked_participants(bigint);
CREATE OR REPLACE FUNCTION remove_unchecked_participants(p_tournament_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_removed_count integer;
BEGIN
    WITH deleted_rows AS (
        DELETE FROM public.tournament_participants
        WHERE tournament_id = p_tournament_id
          AND checked_in = false
        RETURNING *
    )
    SELECT count(*) INTO v_removed_count FROM deleted_rows;

    RETURN v_removed_count;
    
END;
$$;

-- RPC to send daily tournament notifications AND return list for emails
DROP FUNCTION IF EXISTS notify_daily_tournament_participants();
CREATE OR REPLACE FUNCTION notify_daily_tournament_participants()
RETURNS TABLE (
    user_id uuid,
    tournament_title text,
    tournament_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    t_record RECORD;
    p_record RECORD;
BEGIN
    FOR t_record IN
        SELECT id, title, event_date
        FROM public.tournaments
        WHERE tournament_model = 'Diário'
          AND status = 'Aberto'
          AND event_date >= now()
          AND event_date <= (current_date + interval '1 day') -- Matches for the current day
    LOOP
        FOR p_record IN
            SELECT user_id
            FROM public.tournament_participants
            WHERE tournament_id = t_record.id
        LOOP
            -- Check if notification already exists to avoid duplicates
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE user_id = p_record.user_id 
                  AND type = 'system' 
                  AND data->>'message' LIKE '%check-in%' 
                  AND created_at > (now() - interval '12 hours')
            ) THEN
                -- Insert internal notification (Site Bell)
                INSERT INTO public.notifications (user_id, type, data, link)
                VALUES (
                    p_record.user_id,
                    'system',
                    jsonb_build_object('message', 'Não esqueça de fazer o Check-in para o torneio ' || t_record.title || '! O check-in abre 30min antes do início.'),
                    '/tournaments/' || t_record.id
                );
                
                -- Return data for external email service
                user_id := p_record.user_id;
                tournament_title := t_record.title;
                tournament_id := t_record.id;
                RETURN NEXT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;