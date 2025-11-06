-- =================================================================
--  CRITICAL HOTFIX 5: Add missing 'SELECT' RLS policy to 'public.profiles'
-- =================================================================

-- Policy to allow authenticated users to read their own profile.
-- This is crucial for functions like get_user_role() to work correctly
-- when called from other RLS policies (e.g., on storage buckets).
CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
