-- UNIFICAÇÃO DO SISTEMA DE PERMISSÕES (RBAC) - V2
-- Este script centraliza as verificações de cargos para incluir 'super-admin' em todos os níveis de acesso.

BEGIN;

--------------------------------------------------------------------------------
-- 1. FUNÇÕES AUXILIARES (O CORAÇÃO DO SISTEMA)
--------------------------------------------------------------------------------

-- Atualiza get_user_role para ser sempre SECURITY DEFINER e retornar o cargo atual
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
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Função unificada para verificar se o usuário tem privilégios administrativos (Qualquer nível)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
    RETURN user_role IN ('super-admin', 'admin', 'organizer');
END;
$$;

-- Função unificada para verificar se o usuário é especificamente um super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
    RETURN user_role = 'super-admin';
END;
$$;

--------------------------------------------------------------------------------
-- 2. POLÍTICAS DE RLS (TABELAS)
--------------------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to update any profile" ON public.profiles;
CREATE POLICY "Allow admins to update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());

-- TOURNAMENTS
DROP POLICY IF EXISTS "Allow admins to view all tournaments" ON public.tournaments;
CREATE POLICY "Allow admins to view all tournaments" ON public.tournaments FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to create tournaments" ON public.tournaments;
CREATE POLICY "Allow admins to create tournaments" ON public.tournaments FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to update tournaments" ON public.tournaments;
CREATE POLICY "Allow admins to update tournaments" ON public.tournaments FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Allow super-admins to delete tournaments" ON public.tournaments;
CREATE POLICY "Allow super-admins to delete tournaments" ON public.tournaments FOR DELETE USING (public.is_super_admin());

-- MATCHES
DROP POLICY IF EXISTS "Allow admins to update matches" ON public.tournament_matches;
CREATE POLICY "Allow admins to update matches" ON public.tournament_matches FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Allow match insertion" ON public.tournament_matches;
CREATE POLICY "Allow match insertion" ON public.tournament_matches FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow super-admins to delete matches" ON public.tournament_matches;
CREATE POLICY "Allow super-admins to delete matches" ON public.tournament_matches FOR DELETE USING (public.is_super_admin());

-- NEWS
DROP POLICY IF EXISTS "Allow full access for admins and organizers" ON public.news_posts;
CREATE POLICY "Allow full access for admins" ON public.news_posts FOR ALL USING (public.is_admin());

-- SWEEPSTAKES
DROP POLICY IF EXISTS "Allow super-admins to manage sweepstakes" ON public.sweepstakes;
CREATE POLICY "Allow super-admins to manage sweepstakes" ON public.sweepstakes FOR ALL USING (public.is_admin());

--------------------------------------------------------------------------------
-- 3. ATUALIZAÇÃO DE RPCs (FUNÇÕES DE NEGÓCIO)
--------------------------------------------------------------------------------

-- Drop first to avoid return type issues
DROP FUNCTION IF EXISTS public.search_profiles_for_admin(text);

-- Função de busca de perfis para admin
CREATE OR REPLACE FUNCTION public.search_profiles_for_admin(p_search_term text)
RETURNS TABLE(profile_id uuid, username text, avatar_url text, clan_tag text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id, 
        p.username, 
        p.avatar_url,
        c.tag
    FROM public.profiles p
    LEFT JOIN public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN public.clans c ON cm.clan_id = c.id
    WHERE p.username ILIKE '%' || p_search_term || '%'
       OR c.tag ILIKE '%' || p_search_term || '%'
    LIMIT 20;
END;
$$;

-- Função de predições (Tournament Power Rankings)
CREATE OR REPLACE FUNCTION public.get_tournament_power_rankings(p_tournament_id bigint)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    current_wins int,
    global_win_rate numeric,
    current_streak int,
    power_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH player_stats AS (
        SELECT
            tp.user_id,
            p.username,
            p.avatar_url,
            COALESCE(tp.total_wins_in_tournament, 0) as c_wins,
            COALESCE(p.current_win_streak, 0) as c_streak,
            (
                SELECT 
                    CASE WHEN count(*) = 0 THEN 0 
                    ELSE (SUM(CASE WHEN winner_id = tp.user_id THEN 1 ELSE 0 END)::numeric / count(*)) * 100 
                    END
                FROM tournament_matches tm
                WHERE tm.player1_id = tp.user_id OR tm.player2_id = tp.user_id
            ) as g_rate
        FROM public.tournament_participants tp
        JOIN public.profiles p ON tp.user_id = p.id
        WHERE tp.tournament_id = p_tournament_id
    )
    SELECT
        player_stats.user_id,
        player_stats.username,
        player_stats.avatar_url,
        player_stats.c_wins,
        player_stats.g_rate,
        player_stats.c_streak,
        (100 + (player_stats.c_wins * 150) + (player_stats.g_rate * 5) + (player_stats.c_streak * 20))::numeric as power_score
    FROM player_stats
    ORDER BY power_score DESC;
END;
$$;

COMMIT;
