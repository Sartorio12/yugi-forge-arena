-- Drop the old permissive policy on the tournaments table to replace it with more granular ones.
DROP POLICY IF EXISTS "Allow full access for admins and organizers" ON public.tournaments;
DROP POLICY IF EXISTS "Allow public read access to tournaments" ON public.tournaments; -- Also drop this if it exists from previous attempts

-- 1. Read Access Policies
-- Public users can see tournaments that are not soft-deleted.
CREATE POLICY "Allow public read access to active tournaments" ON public.tournaments
FOR SELECT USING (deleted_at IS NULL);

-- Organizers and Super-Admins can view ALL tournaments, including soft-deleted ones.
CREATE POLICY "Allow admins to view all tournaments" ON public.tournaments
FOR SELECT USING (get_user_role() IN ('organizer', 'super-admin'));

-- 2. Insert Access Policy
-- Organizers and Super-Admins can create new tournaments.
CREATE POLICY "Allow admins to create tournaments" ON public.tournaments
FOR INSERT WITH CHECK (get_user_role() IN ('organizer', 'super-admin'));

-- 3. Update Access Policy
-- Organizers and Super-Admins can update existing tournaments.
CREATE POLICY "Allow admins to update tournaments" ON public.tournaments
FOR UPDATE USING (get_user_role() IN ('organizer', 'super-admin'));

-- 4. Delete Access Policy
-- Crucially, ONLY Super-Admins can soft-delete or hard-delete tournaments.
CREATE POLICY "Allow super-admins to delete tournaments" ON public.tournaments
FOR DELETE USING (get_user_role() = 'super-admin');
