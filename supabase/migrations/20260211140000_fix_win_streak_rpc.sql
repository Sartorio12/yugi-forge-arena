-- Overwrite get_current_win_streaks to correctly return the Max Win Streaks (Hall of Fame)
-- instead of just the currently active ones.
CREATE OR REPLACE FUNCTION public.get_current_win_streaks(limit_count integer DEFAULT 5)
RETURNS TABLE(user_id uuid, username text, avatar_url text, streak bigint)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.avatar_url,
        CAST(p.max_win_streak AS bigint) as streak
    FROM 
        public.profiles p
    WHERE 
        p.max_win_streak > 1 -- Only show significant streaks
    ORDER BY 
        p.max_win_streak DESC,
        p.current_win_streak DESC,
        p.username ASC
    LIMIT limit_count;
END;
$$;
