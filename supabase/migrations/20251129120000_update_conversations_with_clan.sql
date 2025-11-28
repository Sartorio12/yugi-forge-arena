-- Drop the function first to allow return type change (cascade drops the function too if dependent)
DROP FUNCTION IF EXISTS public.get_my_conversations();
DROP TYPE IF EXISTS public.conversation_summary;

-- Re-define the type with the new column
CREATE TYPE public.conversation_summary AS (
    other_user_id uuid,
    username text,
    avatar_url text,
    is_online boolean,
    last_message_content text,
    last_message_at timestamptz,
    unread_count bigint,
    clan_tag text
);

-- Re-create the function
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS setof public.conversation_summary
LANGUAGE sql
AS $$
    SELECT
        p.id as other_user_id,
        p.username,
        p.avatar_url,
        p.is_online,
        (
            SELECT content FROM public.direct_messages
            WHERE (sender_id = p.id AND receiver_id = auth.uid()) OR (sender_id = auth.uid() AND receiver_id = p.id)
            ORDER BY created_at DESC LIMIT 1
        ) as last_message_content,
        (
            SELECT created_at FROM public.direct_messages
            WHERE (sender_id = p.id AND receiver_id = auth.uid()) OR (sender_id = auth.uid() AND receiver_id = p.id)
            ORDER BY created_at DESC LIMIT 1
        ) as last_message_at,
        (
            SELECT count(*) FROM public.direct_messages
            WHERE sender_id = p.id AND receiver_id = auth.uid() AND is_read = false
        ) as unread_count,
        c.tag as clan_tag
    FROM (
        SELECT DISTINCT
            CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END as user_id
        FROM public.direct_messages
        WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
    ) as conversations
    JOIN public.profiles p ON conversations.user_id = p.id
    LEFT JOIN public.clan_members cm ON p.id = cm.user_id
    LEFT JOIN public.clans c ON cm.clan_id = c.id
    ORDER BY last_message_at DESC;
$$;
