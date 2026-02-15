-- 20260214160000_add_created_at_to_profiles.sql
-- Add proper registration date tracking to profiles without losing historical data

-- 1. Add the column (allowing NULL initially to facilitate backfill)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;

-- 2. BACKFILL: Sync with the real registration date from Supabase Auth system
-- This is the crucial part to avoid bias!
UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id;

-- 3. Safety fallback: If any profile doesn't have an auth user (rare), use updated_at
UPDATE public.profiles 
SET created_at = updated_at 
WHERE created_at IS NULL;

-- 4. Set the constraints and default for future users
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.profiles ALTER COLUMN created_at SET NOT NULL;

-- 5. Update the handle_new_user function to ensure it's always populated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.created_at);
  RETURN new;
END;
$$;
