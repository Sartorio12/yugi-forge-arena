-- Add is_private column to tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- RPC to manually add a participant by an admin/organizer
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_tournament_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger Function to block direct registration if private
CREATE OR REPLACE FUNCTION public.check_tournament_privacy_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_private boolean;
BEGIN
    SELECT is_private INTO v_is_private
    FROM public.tournaments
    WHERE id = NEW.tournament_id;

    -- If private, only the admin_add_participant RPC (which bypasses this check or we can handle)
    -- Actually, if we use direct INSERT in the RPC, this trigger will fire.
    -- We can detect if it's the RPC by checking a session variable or just checking if the current user is ADM.
    -- But a simpler way: regular users can NEVER insert if it's private.
    -- The RPC is SECURITY DEFINER, so it runs as the owner (admin).
    
    IF v_is_private AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Este torneio é privado. Inscrições manuais são realizadas apenas por administradores.';
    END IF;

    RETURN NEW;
END;
$$;

-- Bind Trigger
DROP TRIGGER IF EXISTS check_privacy_before_registration ON public.tournament_participants;
CREATE TRIGGER check_privacy_before_registration
BEFORE INSERT ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION public.check_tournament_privacy_on_registration();
