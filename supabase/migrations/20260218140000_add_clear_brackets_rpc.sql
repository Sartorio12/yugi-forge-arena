-- Function to clear only bracket matches (round_number > 0)
CREATE OR REPLACE FUNCTION public.clear_tournament_brackets(p_tournament_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- RBAC: Only super-admin or the organizer of this tournament can clear brackets
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON p.id = t.organizer_id
        WHERE p.id = auth.uid() AND p.role = 'organizer' AND t.id = p_tournament_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'super-admin' OR role = 'admin')
    ) AND auth.uid() != '80193776-6790-457c-906d-ed45ea16df9f' THEN
        RAISE EXCEPTION 'Access denied: You must be a super-admin, admin or the organizer of this tournament to clear brackets.';
    END IF;

    DELETE FROM public.tournament_matches 
    WHERE tournament_id = p_tournament_id 
    AND round_number > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
