-- Overload admin_add_participant to accept p_ prefixes as well, just in case
CREATE OR REPLACE FUNCTION public.admin_add_participant(p_tournament_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Forward to the main function
    PERFORM public.admin_add_participant(tournament_id := p_tournament_id, user_id := p_user_id);
END;
$$;

-- Grant permissions for the overloaded function
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_participant(bigint, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
