import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface NotificationBellProps {
    user: User;
}

const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10); // Fetch a reasonable number of notifications

    if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
    }
    return data;
};

export const NotificationBell = ({ user }: NotificationBellProps) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', user.id],
        queryFn: () => fetchNotifications(user.id),
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const markAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) || [];
            if (unreadIds.length === 0) return;
            const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
    });

    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            const timer = setTimeout(() => {
                markAsReadMutation.mutate();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, unreadCount, markAsReadMutation]);
    
    useEffect(() => {
        if (!user) return; // Only subscribe if user is defined

        const channel = supabase.channel(`notifications:${user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log('Realtime event received!', payload);
                    queryClient.setQueryData(['notifications', user.id], (oldData: any[] | undefined) => {
                        if (!oldData) return [payload.new];
                        // Avoid adding duplicates
                        if (oldData.some(n => n.id === payload.new.id)) return oldData;
                        return [payload.new, ...oldData];
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to realtime channel!');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime channel error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);


    const renderNotificationText = (notification) => {
        const { type, data } = notification;
        const actor = <strong>{data.actor_username || 'Alguém'}</strong>;

        switch (type) {
            case 'new_deck_comment':
                return <>{actor} comentou no seu deck: <em>{data.deck_name}</em></>;
            case 'new_news_comment':
                return <>{actor} comentou na sua notícia: <em>{data.post_title}</em></>;
            case 'new_comment_reply':
                return <>{actor} respondeu ao seu comentário.</>;
            case 'new_deck_like':
                return <>{actor} curtiu seu deck: <em>{data.deck_name}</em></>;
            case 'new_news_like':
                return <>{actor} curtiu sua notícia: <em>{data.post_title}</em></>;
            case 'new_comment_like':
                return <>{actor} curtiu seu comentário.</>;
            case 'new_clan_member':
                return <>Um novo membro, <strong>{data.new_member_username}</strong>, entrou no seu clã: <em>{data.clan_name}</em></>;
            default:
                return 'Nova notificação';
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
                <div className="p-2">
                    <h4 className="font-medium leading-none mb-4">Notificações</h4>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : notifications && notifications.length > 0 ? (
                        <div className="space-y-1">
                            {notifications.map(n => {
                                const isClanNotification = n.type === 'new_clan_member';
                                let correctedLink = n.link;
                                if (n.type === 'new_clan_member' && n.link && n.link.startsWith('/clan/')) {
                                    correctedLink = n.link.replace('/clan/', '/clans/');
                                }
                                return (
                                    <Link key={n.id} to={correctedLink || '#'} className={`block p-3 rounded-md hover:bg-muted ${!n.is_read ? 'bg-blue-950/50' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            {!isClanNotification && n.data.actor_username && (
                                                <Avatar className="h-8 w-8 border-2 border-transparent group-hover:border-primary transition-colors">
                                                    <AvatarImage src={n.data.actor_avatar_url} />
                                                    <AvatarFallback>{n.data.actor_username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm text-foreground/90">
                                                    {renderNotificationText(n)}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}</p>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma notificação ainda.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
