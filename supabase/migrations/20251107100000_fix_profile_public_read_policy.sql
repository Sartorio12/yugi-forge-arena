-- Remove a política anterior para evitar conflitos
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON public.profiles;
-- Remove a política original também, caso ela ainda exista
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;

-- Cria uma nova política de leitura pública
CREATE POLICY "Allow public read access to all profiles"
ON public.profiles
FOR SELECT
USING (true);
