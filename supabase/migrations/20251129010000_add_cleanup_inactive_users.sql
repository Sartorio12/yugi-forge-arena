
CREATE OR REPLACE FUNCTION public.cleanup_inactive_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark users as offline if they haven't been seen in the last 2 minutes
  UPDATE public.profiles
  SET is_online = false
  WHERE is_online = true
    AND last_seen < (NOW() - INTERVAL '2 minutes');
END;
$$;
