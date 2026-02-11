-- Drop existing policies on tournament_matches to redefine access control
DROP POLICY IF EXISTS "Organizers and Admins can insert matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Allow match insertion" ON public.tournament_matches;
DROP POLICY IF EXISTS "Allow super-admins to update matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Allow super-admins to delete matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Public can read matches" ON public.tournament_matches;


-- 1. Read Access
CREATE POLICY "Public can read matches" ON public.tournament_matches
FOR SELECT USING (true);

-- 2. Insert Access
-- Organizers and Super-Admins can create new match records.
CREATE POLICY "Allow match insertion" ON public.tournament_matches
FOR INSERT WITH CHECK (get_user_role() IN ('organizer', 'super-admin'));

-- 3. Update Access
-- ONLY Super-Admins can update a match (e.g., change winner, scores, or mark as W.O.).
CREATE POLICY "Allow super-admins to update matches" ON public.tournament_matches
FOR UPDATE USING (get_user_role() = 'super-admin');

-- 4. Delete Access
-- ONLY Super-Admins can delete a match record.
CREATE POLICY "Allow super-admins to delete matches" ON public.tournament_matches
FOR DELETE USING (get_user_role() = 'super-admin');
