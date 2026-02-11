-- Update get_user_role to be SECURITY DEFINER for broader use in policies
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- A user is considered a general "admin" if they are an organizer or a super-admin.
-- This provides backward compatibility for policies that don't need granular control.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN user_role IN ('organizer', 'super-admin');
END;
$$;

-- New function to specifically check for the super-admin role.
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN user_role = 'super-admin';
END;
$$;
