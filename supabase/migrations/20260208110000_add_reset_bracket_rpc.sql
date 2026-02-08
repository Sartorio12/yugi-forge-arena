-- Function to completely clear tournament matches (reset bracket)
CREATE OR REPLACE FUNCTION public.reset_tournament_bracket(p_tournament_id BIGINT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.tournament_matches WHERE tournament_id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
