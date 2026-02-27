
-- Hotfix: Add registration lock based on tournament start time
CREATE OR REPLACE FUNCTION public.register_to_tournament(
    p_tournament_id BIGINT,
    p_user_id UUID,
    p_team_selection TEXT DEFAULT NULL,
    p_card_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflicting_card TEXT;
    v_clan_id INTEGER;
    v_is_private BOOLEAN;
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_status TEXT;
BEGIN
    -- 1. Check if tournament exists, its privacy, start date and status
    SELECT is_private, start_date, status
    INTO v_is_private, v_start_date, v_status
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF v_is_private IS NULL THEN
        RAISE EXCEPTION 'Torneio não encontrado.';
    END IF;

    -- 2. Check if registration is still open
    IF v_status IN ('Concluído', 'Cancelado') THEN
        RAISE EXCEPTION 'Este torneio já foi concluído ou cancelado.';
    END IF;

    IF now() >= v_start_date THEN
        RAISE EXCEPTION 'As inscrições para este torneio já foram encerradas.';
    END IF;

    -- 3. Privacy check: If private, only admins can register users (via admin_add_participant)
    IF v_is_private AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Este torneio é privado. Inscrições são feitas manualmente pelos organizadores.';
    END IF;

    -- 4. Check if user is already enrolled
    IF EXISTS (SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Você já está inscrito neste torneio.';
    END IF;

    -- 5. Check for conflicting bans (for banishment mode)
    IF array_length(p_card_ids, 1) > 0 THEN
        SELECT card_id INTO v_conflicting_card
        FROM public.tournament_banned_cards
        WHERE tournament_id = p_tournament_id
          AND card_id = ANY(p_card_ids)
        LIMIT 1;

        IF v_conflicting_card IS NOT NULL THEN
            RAISE EXCEPTION 'O card % já foi banido por outro jogador.', v_conflicting_card;
        END IF;
    END IF;

    -- 6. Get user's current clan for stamping
    SELECT clan_id INTO v_clan_id
    FROM public.clan_members
    WHERE user_id = p_user_id;

    -- 7. Register user in participants
    INSERT INTO public.tournament_participants (
        tournament_id, 
        user_id, 
        team_selection,
        clan_id
    )
    VALUES (
        p_tournament_id, 
        p_user_id, 
        p_team_selection,
        v_clan_id
    );

    -- 8. Insert banned cards if any
    IF array_length(p_card_ids, 1) > 0 THEN
        INSERT INTO public.tournament_banned_cards (tournament_id, user_id, card_id)
        SELECT p_tournament_id, p_user_id, unnest(p_card_ids);
    END IF;
END;
$$;
