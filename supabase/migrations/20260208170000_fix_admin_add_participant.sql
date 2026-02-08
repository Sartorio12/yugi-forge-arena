-- Recreate admin_add_participant to force schema cache reload and ensure permissions
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_tournament_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clan_id uuid;
BEGIN
    -- Check permissions (caller must be admin or the tournament organizer)
    IF NOT public.is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = p_tournament_id AND organizer_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores ou o organizador podem adicionar participantes manualmente.';
    END IF;

    -- Check if already registered
    IF EXISTS (
        SELECT 1 FROM public.tournament_participants 
        WHERE tournament_id = p_tournament_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Este jogador já está inscrito neste torneio.';
    END IF;

    -- Get user's current clan (for stamping)
    SELECT clan_id INTO v_clan_id
    FROM public.clan_members
    WHERE user_id = p_user_id;

    -- Insert participant
    INSERT INTO public.tournament_participants (
        tournament_id,
        user_id,
        clan_id,
        checked_in
    ) VALUES (
        p_tournament_id,
        p_user_id,
        v_clan_id,
        false
    );
END;
$$;

-- Grant execute permissions explicitly
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO service_role;

-- Force schema cache reload by notifying pgrst (if configured) or just by DDL change
COMMENT ON FUNCTION public.admin_add_participant IS 'Allows admins to manually add participants to tournaments.';
