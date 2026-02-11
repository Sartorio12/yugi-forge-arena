-- Rename the primary admin role to 'super-admin' and demote other admins to 'organizer'

BEGIN;

-- Step 1: Update the primary user's role to 'super-admin'
UPDATE public.profiles
SET role = 'super-admin'
WHERE id = '80193776-6790-457c-906d-ed45ea16df9f';

-- Step 2: Update all other 'admin' users to the 'organizer' role
UPDATE public.profiles
SET role = 'organizer'
WHERE role = 'admin' AND id != '80193776-6790-457c-906d-ed45ea16df9f';

COMMIT;
