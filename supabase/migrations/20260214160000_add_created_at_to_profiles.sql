
-- 20260214160000_add_created_at_to_profiles.sql
-- Add proper registration date tracking to profiles

-- 1. Add the column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Backfill existing users with data from auth.users (if possible)
-- This tries to sync the public profile date with the internal auth system date
UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id AND p.created_at = p.updated_at; -- Only update if likely recently added/synced

-- 3. Update the handle_new_user function to include created_at explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (new.id, new.raw_user_meta_data->>'username', NOW());
  RETURN new;
END;
$$;
