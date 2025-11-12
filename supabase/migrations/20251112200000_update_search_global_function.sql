
CREATE OR REPLACE FUNCTION "public"."search_global"("search_term" "text") RETURNS TABLE("id" "text", "name" "text", "avatar_url" "text", "type" "text", "tag" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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
      c.tag AS tag
    FROM
      public.profiles AS p
    LEFT JOIN
      public.clan_members AS cm ON p.id = cm.user_id
    LEFT JOIN
      public.clans AS c ON cm.clan_id = c.id
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
$$;
