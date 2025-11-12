CREATE OR REPLACE FUNCTION public.get_deck_comments(p_deck_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', dc.id,
                'comment_text', dc.comment_text,
                'created_at', dc.created_at,
                'parent_comment_id', dc.parent_comment_id,
                'profiles', json_build_object(
                    'id', p.id,
                    'username', p.username,
                    'avatar_url', p.avatar_url,
                    'clans', (SELECT json_build_object('tag', c.tag) FROM public.clan_members cm JOIN public.clans c ON cm.clan_id = c.id WHERE cm.user_id = p.id LIMIT 1)
                ),
                'likes', COALESCE((
                    SELECT json_agg(
                        json_build_object('user_id', dcl.user_id)
                    )
                    FROM public.deck_comment_likes dcl
                    WHERE dcl.comment_id = dc.id
                ), '[]'::json)
            )
        )
        FROM public.deck_comments dc
        LEFT JOIN public.profiles p ON dc.user_id = p.id
        WHERE dc.deck_id = p_deck_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_news_comments(p_post_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', nc.id,
                'comment_text', nc.comment_text,
                'created_at', nc.created_at,
                'parent_comment_id', nc.parent_comment_id,
                'profiles', json_build_object(
                    'id', p.id,
                    'username', p.username,
                    'avatar_url', p.avatar_url,
                    'clans', (SELECT json_build_object('tag', c.tag) FROM public.clan_members cm JOIN public.clans c ON cm.clan_id = c.id WHERE cm.user_id = p.id LIMIT 1)
                ),
                'likes', COALESCE((
                    SELECT json_agg(
                        json_build_object('user_id', ncl.user_id)
                    )
                    FROM public.news_comment_likes ncl
                    WHERE ncl.comment_id = nc.id
                ), '[]'::json)
            )
        )
        FROM public.news_comments nc
        LEFT JOIN public.profiles p ON nc.user_id = p.id
        WHERE nc.post_id = p_post_id
    );
END;
$$;