DROP POLICY "Allow users to read their own profile" ON public.profiles;

CREATE POLICY "Allow authenticated users to read all profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');
