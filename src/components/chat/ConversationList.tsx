import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationSummary {
    other_user_id: string;
    username: string;
    avatar_url: string;
    is_online: boolean;
    last_message_content: string;
    last_message_at: string;
    unread_count: number;
    clan_tag: string | null;
}

interface ConversationListProps {
    onSelectConversation: (userId: string) => void;
    selectedUserId: string | null;
}

export const ConversationList = ({ onSelectConversation, selectedUserId }: ConversationListProps) => {
    const { data: conversations, isLoading } = useQuery<ConversationSummary[], Error>({
        queryKey: ['conversations'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_my_conversations');
            if (error) throw error;
            return data || [];
        }
    });

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold">Conversas</h2>
            </div>
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : conversations && conversations.length > 0 ? (
                <ScrollArea className="flex-1">
                    <div className="space-y-1 p-2">
                        {conversations.map(convo => (
                            <button
                                key={convo.other_user_id}
                                onClick={() => onSelectConversation(convo.other_user_id)}
                                className={`w-full text-left p-3 rounded-lg grid grid-cols-[auto_1fr] gap-3 transition-colors ${selectedUserId === convo.other_user_id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={convo.avatar_url} />
                                        <AvatarFallback>{convo.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {convo.is_online && (
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                    )}
                                </div>
                                <div className="overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center mb-0.5 gap-2">
                                        <h3 className="font-semibold truncate min-w-0">
                                            {convo.clan_tag && <span className="text-yellow-500 mr-1">[{convo.clan_tag}]</span>}
                                            {convo.username}
                                        </h3>
                                        {convo.last_message_at && (
                                            <p className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(convo.last_message_at), { locale: ptBR, addSuffix: false }).replace('cerca de ', '')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="text-sm text-muted-foreground truncate">
                                            {convo.last_message_content}
                                        </p>
                                        {convo.unread_count > 0 && (
                                            <Badge className="bg-primary h-5 px-2 shrink-0">{convo.unread_count}</Badge>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma conversa encontrada.</p>
                </div>
            )}
        </div>
    );
};
