-- 1. CLEANUP: Drop all possible variations to avoid ambiguity in schema cache
DROP FUNCTION IF EXISTS public.admin_add_participant(bigint, uuid);
DROP FUNCTION IF EXISTS public.admin_add_participant(integer, uuid);
DROP FUNCTION IF EXISTS public.admin_add_participant(p_tournament_id bigint, p_user_id uuid);
DROP FUNCTION IF EXISTS public.admin_add_participant(tournament_id bigint, user_id uuid);

-- 2. CREATE: Use the standard p_ prefix signature
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_tournament_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clan_id integer;
BEGIN
    -- Check permissions (caller must be admin or organizer)
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

    -- Get user's current clan
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

-- 3. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO service_role;

-- 4. CACHE RELOAD
NOTIFY pgrst, 'reload schema';
COMMENT ON FUNCTION public.admin_add_participant IS 'Oficial manual enrollment function for admins and organizers.';
