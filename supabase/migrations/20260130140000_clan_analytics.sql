-- Function to get detailed analytics for a clan
CREATE OR REPLACE FUNCTION get_clan_analytics(p_clan_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_wins bigint;
    v_total_participations bigint;
    v_top_contributors json;
    v_recent_tournaments json;
BEGIN
    -- 1. Total Wins & Participations
    SELECT 
        COALESCE(SUM(total_wins_in_tournament), 0),
        COUNT(*)
    INTO 
        v_total_wins,
        v_total_participations
    FROM 
        public.tournament_participants
    WHERE 
        clan_id = p_clan_id;

    -- 2. Top Contributors (Members with most wins for the clan)
    SELECT json_agg(t) FROM (
        SELECT 
            p.username,
            p.avatar_url,
            SUM(tp.total_wins_in_tournament) as wins
        FROM 
            public.tournament_participants tp
        JOIN 
            public.profiles p ON tp.user_id = p.id
        WHERE 
            tp.clan_id = p_clan_id
        GROUP BY 
            p.id, p.username, p.avatar_url
        HAVING 
            SUM(tp.total_wins_in_tournament) > 0
        ORDER BY 
            wins DESC
        LIMIT 5
    ) t INTO v_top_contributors;

    -- 3. Recent Tournaments (Where the clan participated)
    SELECT json_agg(t) FROM (
        SELECT 
            t.title,
            t.event_date,
            COUNT(tp.id) as participant_count,
            SUM(tp.total_wins_in_tournament) as total_wins
        FROM 
            public.tournament_participants tp
        JOIN 
            public.tournaments t ON tp.tournament_id = t.id
        WHERE 
            tp.clan_id = p_clan_id
        GROUP BY 
            t.id, t.title, t.event_date
        ORDER BY 
            t.event_date ASC -- Ordered ASC for charts (time progression)
        LIMIT 10
    ) t INTO v_recent_tournaments;

    RETURN json_build_object(
        'total_wins', v_total_wins,
        'total_participations', v_total_participations,
        'top_contributors', COALESCE(v_top_contributors, '[]'::json),
        'recent_tournaments', COALESCE(v_recent_tournaments, '[]'::json)
    );
END;
$$;
