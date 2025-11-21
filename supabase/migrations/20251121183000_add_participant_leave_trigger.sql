-- This function is called by the trigger when a row is deleted from tournament_participants
CREATE OR REPLACE FUNCTION public.delete_user_tournament_decks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all deck submissions for the user who is leaving the tournament
  DELETE FROM public.tournament_decks
  WHERE user_id = OLD.user_id AND tournament_id = OLD.tournament_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists, to make this script re-runnable
DROP TRIGGER IF EXISTS on_participant_leave ON public.tournament_participants;

-- Create the trigger that fires AFTER a participant is deleted
CREATE TRIGGER on_participant_leave
  AFTER DELETE ON public.tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_user_tournament_decks();