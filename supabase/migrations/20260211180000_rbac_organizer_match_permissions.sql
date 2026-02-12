-- Grant organizers the ability to manage matches by allowing them to update match records.
-- Deleting matches remains a super-admin only privilege for safety.

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Allow super-admins to update matches" ON public.tournament_matches;

-- Create a new policy allowing both organizers and super-admins to update
CREATE POLICY "Allow admins to update matches" ON public.tournament_matches
FOR UPDATE USING (get_user_role() IN ('organizer', 'super-admin'));
