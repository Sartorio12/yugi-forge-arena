-- Migration: Fix Match History to show BYE matches
-- Date: 2026-02-20

CREATE OR REPLACE FUNCTION public.get_player_match_history(p_user_id uuid)
 RETURNS TABLE(match_id integer, tournament_id integer, tournament_title text, tournament_date date, round_name text, opponent_id uuid, opponent_name text, opponent_avatar text, opponent_frame text, opponent_clan_tag text, result text, is_wo boolean, score_p1 integer, score_p2 integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        m.id::integer as match_id,
        t.id::integer as tournament_id,
        t.title::text as tournament_title,
        COALESCE(t.event_date::date, m.created_at::date)::date as tournament_date,
        m.round_name::text,
        -- Opponent ID can be NULL for BYEs
        CASE 
            WHEN m.player1_id = p_user_id THEN m.player2_id 
            ELSE m.player1_id 
        END::uuid as opponent_id,
        -- Handle BYE name
        COALESCE(op.username::text, 'SISTEMA (BYE)') as opponent_name,
        op.avatar_url::text as opponent_avatar,
        op.equipped_frame_url::text as opponent_frame,
        c.tag::text as opponent_clan_tag,
        -- Result
        CASE 
            WHEN m.winner_id = p_user_id THEN 'WIN'::text 
            ELSE 'LOSS'::text 
        END as result,
        m.is_wo::boolean,
        -- Scores
        COALESCE(CASE WHEN m.player1_id = p_user_id THEN m.player1_score ELSE m.player2_score END, 0)::integer as score_p1,
        COALESCE(CASE WHEN m.player1_id = p_user_id THEN m.player2_score ELSE m.player1_score END, 0)::integer as score_p2
    FROM 
        public.tournament_matches m
    JOIN 
        public.tournaments t ON m.tournament_id = t.id
    -- Use LEFT JOIN to not exclude matches where player2_id is NULL (BYEs)
    LEFT JOIN 
        public.profiles op ON op.id = (CASE WHEN m.player1_id = p_user_id THEN m.player2_id ELSE m.player1_id END)
    LEFT JOIN 
        public.clan_members cm ON op.id = cm.user_id
    LEFT JOIN 
        public.clans c ON cm.clan_id = c.id
    WHERE 
        m.player1_id = p_user_id OR m.player2_id = p_user_id
    ORDER BY 
        m.created_at DESC;
END;
$function$;
