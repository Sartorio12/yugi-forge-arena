-- Add RBAC to reset_tournament_bracket function.
-- This function was moved to a separate migration file for clarity and to avoid issues with `replace` command when updating existing functions.

CREATE OR REPLACE FUNCTION public.reset_tournament_bracket(p_tournament_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- RBAC: Only super-admin or the organizer of this tournament can reset brackets
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin or the organizer of this tournament to reset brackets.';
    END IF;

    DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
