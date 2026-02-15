-- Function to safely remove a participant from a tournament
CREATE OR REPLACE FUNCTION public.admin_remove_participant(p_participant_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament_id bigint;
    v_user_id uuid;
BEGIN
    -- Get tournament and user info
    SELECT tournament_id, user_id INTO v_tournament_id, v_user_id
    FROM public.tournament_participants
    WHERE id = p_participant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Participante não encontrado.';
    END IF;

    -- Check permissions (HARD BYPASS FOR SUPER ADMIN)
    IF auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f' THEN
        -- Allow
    ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin')) THEN
        -- Allow
    ELSIF EXISTS (SELECT 1 FROM public.tournaments WHERE id = v_tournament_id AND organizer_id = auth.uid()) THEN
        -- Allow
    ELSE
        RAISE EXCEPTION 'Acesso negado: apenas administradores ou o organizador podem remover participantes.';
    END IF;

    -- 1. Remove associated decks for this tournament
    DELETE FROM public.tournament_decks
    WHERE tournament_id = v_tournament_id AND user_id = v_user_id;

    -- 2. Handle matches
    UPDATE public.tournament_matches
    SET player1_id = NULL, winner_id = CASE WHEN winner_id = v_user_id THEN NULL ELSE winner_id END
    WHERE tournament_id = v_tournament_id AND player1_id = v_user_id;
    
    UPDATE public.tournament_matches
    SET player2_id = NULL, winner_id = CASE WHEN winner_id = v_user_id THEN NULL ELSE winner_id END
    WHERE tournament_id = v_tournament_id AND player2_id = v_user_id;

    -- 3. Finally remove the participant
    DELETE FROM public.tournament_participants
    WHERE id = p_participant_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_participant(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_participant(bigint) TO service_role;
