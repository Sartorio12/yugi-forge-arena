import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface MessageBellProps {
    user: User;
}

export const MessageBell = ({ user }: MessageBellProps) => {
    const { data: conversations } = useQuery({
        queryKey: ['conversations'], // Share query key with ConversationList to leverage cache and invalidation
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_my_conversations');
            if (error) throw error;
            return data || [];
        },
        // We rely on GlobalChatListener to invalidate this query on new messages
        // But a fallback polling is good for initial sync or missed events
        staleTime: 1000 * 60, 
    });

    const unreadCount = conversations?.reduce((acc: number, curr: any) => acc + (curr.unread_count || 0), 0) || 0;

    return (
        <Link to="/messages">
            <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-in zoom-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>
        </Link>
    );
}
