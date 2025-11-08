CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url
  FROM
    public.profiles AS p
  WHERE
    p.username ILIKE '%' || search_term || '%'
    AND p.id <> auth.uid() -- Exclude the current user from results
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
