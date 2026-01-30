-- Update function to include member participation stats
CREATE OR REPLACE FUNCTION get_clan_analytics(p_clan_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_wins bigint;
    v_total_participations bigint;
    v_top_contributors json;
    v_recent_tournaments json;
    v_member_stats json;
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

    -- 2. Top Contributors
    SELECT json_agg(t) INTO v_top_contributors FROM (
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
    ) t;

    -- 3. Recent Tournaments
    SELECT json_agg(t) INTO v_recent_tournaments FROM (
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
            t.event_date ASC
        LIMIT 10
    ) t;

    -- 4. Detailed Member Stats
    SELECT json_agg(t) INTO v_member_stats FROM (
        SELECT 
            p.username,
            p.avatar_url,
            COUNT(tp.id) as tournaments_played,
            COALESCE(SUM(tp.total_wins_in_tournament), 0) as total_wins,
            CASE 
                WHEN COUNT(tp.id) = 0 THEN 0 
                ELSE ROUND(COALESCE(SUM(tp.total_wins_in_tournament), 0)::numeric / COUNT(tp.id), 2) 
            END as avg_wins
        FROM 
            public.clan_members cm
        JOIN 
            public.profiles p ON cm.user_id = p.id
        LEFT JOIN
            public.tournament_participants tp ON tp.user_id = cm.user_id AND tp.clan_id = p_clan_id
        WHERE 
            cm.clan_id = p_clan_id
        GROUP BY 
            p.id, p.username, p.avatar_url
        ORDER BY 
            tournaments_played ASC, total_wins ASC
    ) t;

    RETURN json_build_object(
        'total_wins', v_total_wins,
        'total_participations', v_total_participations,
        'top_contributors', COALESCE(v_top_contributors, '[]'::json),
        'recent_tournaments', COALESCE(v_recent_tournaments, '[]'::json),
        'member_stats', COALESCE(v_member_stats, '[]'::json)
    );
END;
$$;