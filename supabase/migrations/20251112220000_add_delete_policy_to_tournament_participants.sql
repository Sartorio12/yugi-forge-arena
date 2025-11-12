-- Create a DELETE policy for tournament_participants table
CREATE POLICY "Allow admins and organizers to delete participants"
ON public.tournament_participants
FOR DELETE
USING (
  (get_user_role() = 'admin') OR
  (get_user_role() = 'organizer')
);