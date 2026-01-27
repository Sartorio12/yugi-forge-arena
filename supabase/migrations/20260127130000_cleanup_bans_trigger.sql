CREATE OR REPLACE FUNCTION public.cleanup_banned_cards_on_participant_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.tournament_banned_cards
    WHERE tournament_id = OLD.tournament_id AND user_id = OLD.user_id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_cleanup_banned_cards
AFTER DELETE ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_banned_cards_on_participant_leave();
