-- Fix RLS policies for profiles table to include 'super-admin' and optimize role checks

BEGIN;

-- 1. Update 'Admins can view all profiles' policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT TO public 
USING (get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text, 'organizer'::text]));

-- 2. Update 'Allow admins to update any profile' policy
DROP POLICY IF EXISTS "Allow admins to update any profile" ON public.profiles;
CREATE POLICY "Allow admins to update any profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text]))
WITH CHECK (get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text]));

-- 3. Ensure 'Public profiles are viewable by everyone' is truly public to avoid any blocking
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles 
FOR SELECT TO public 
USING (true);

-- 4. Fix any other RBAC policies that might be missing super-admin
-- Tournaments management
DROP POLICY IF EXISTS "Admins can manage all tournaments" ON public.tournaments;
CREATE POLICY "Admins can manage all tournaments" ON public.tournaments
FOR ALL TO authenticated
USING (get_user_role() = ANY (ARRAY['super-admin'::text, 'admin'::text, 'organizer'::text]));

COMMIT;
