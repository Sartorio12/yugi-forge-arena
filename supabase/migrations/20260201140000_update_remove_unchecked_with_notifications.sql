-- Update remove_unchecked_participants to include notifications for Misses and Blocks
CREATE OR REPLACE FUNCTION remove_unchecked_participants(p_tournament_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_removed_count integer := 0;
    v_tournament_title text;
    participant_record RECORD;
BEGIN
    -- Get tournament title for the notification message
    SELECT title INTO v_tournament_title FROM public.tournaments WHERE id = p_tournament_id;

    -- Iterate over participants who haven't checked in
    FOR participant_record IN
        SELECT user_id
        FROM public.tournament_participants
        WHERE tournament_id = p_tournament_id
          AND checked_in = false
    LOOP
        -- 1. Increment consecutive misses
        UPDATE public.profiles
        SET consecutive_misses = consecutive_misses + 1
        WHERE id = participant_record.user_id;

        -- 2. Notify the user about the miss
        INSERT INTO public.notifications (user_id, type, content)
        VALUES (
            participant_record.user_id,
            'system',
            'Você não realizou o check-in para o torneio "' || COALESCE(v_tournament_title, 'Torneio') || '". Sua falta foi contabilizada.'
        );

        -- 3. Check and Apply block if misses >= 3
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = participant_record.user_id AND consecutive_misses >= 3) THEN
            UPDATE public.profiles
            SET blocked_until = now() + interval '1 week',
                consecutive_misses = 0 -- Reset counter after punishment
            WHERE id = participant_record.user_id;

            -- 4. Notify the user about the Block
            INSERT INTO public.notifications (user_id, type, content)
            VALUES (
                participant_record.user_id,
                'system',
                'ALERTA: Você foi bloqueado de novas inscrições por 7 dias devido a 3 faltas consecutivas.'
            );
        END IF;

        v_removed_count := v_removed_count + 1;
    END LOOP;

    -- 5. Delete the participants
    DELETE FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id
      AND checked_in = false;

    RETURN v_removed_count;
END;
$$;
