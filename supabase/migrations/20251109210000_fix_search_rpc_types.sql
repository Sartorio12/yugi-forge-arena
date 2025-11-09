DROP FUNCTION IF EXISTS public.search_global;

CREATE OR REPLACE FUNCTION public.search_global(search_term TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  avatar_url TEXT,
  type TEXT,
  tag TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    -- Search Users
    SELECT
      p.id::text,
      p.username AS name,
      p.avatar_url,
      'user' AS type,
      NULL AS tag
    FROM
      public.profiles AS p
    WHERE
      p.username ILIKE '%' || search_term || '%'
      AND p.id <> auth.uid()
    LIMIT 5
  )
  UNION ALL
  (
    -- Search Clans
    SELECT
      c.id::text,
      c.name,
      c.icon_url AS avatar_url,
      'clan' AS type,
      c.tag
    FROM
      public.clans AS c
    WHERE
      c.name ILIKE '%' || search_term || '%' OR c.tag ILIKE '%' || search_term || '%'
    LIMIT 5
  );
END;
$$ LANGUAGE plpgsql;
