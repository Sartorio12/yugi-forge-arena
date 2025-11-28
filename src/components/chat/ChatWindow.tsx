import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2, Send, CornerDownLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_PER_PAGE = 30;

interface ChatWindowProps {
    selectedUserId: string | null;
    currentUser: User | null;
    showHeader?: boolean; // New prop
}

const fetchMessages = async ({ pageParam = 0, queryKey }: any) => {
    const [, currentUserId, otherUserId] = queryKey;
    const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1);

    if (error) throw error;
    return data.reverse(); // reverse to show latest at the bottom
};

export const ChatWindow = ({ selectedUserId, currentUser, showHeader = true }: ChatWindowProps) => {
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const { profile: otherUserProfile, isLoading: isLoadingProfile } = useProfile(selectedUserId);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingMessages,
    } = useInfiniteQuery({
        queryKey: ['messages', currentUser?.id, selectedUserId],
        queryFn: fetchMessages,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === MESSAGES_PER_PAGE ? allPages.length * MESSAGES_PER_PAGE : undefined;
        },
        enabled: !!currentUser && !!selectedUserId,
    });

        const sendMessageMutation = useMutation({

            mutationFn: async (content: string) => {

                if (!currentUser || !selectedUserId) throw new Error("Usuário não selecionado");

                

                const { data, error } = await supabase.from('direct_messages').insert({

                    sender_id: currentUser.id,

                    receiver_id: selectedUserId,

                    content,

                }).select();

    

                if (error) throw error;

                return data[0];

            },

            onSuccess: () => {
                setNewMessage('');
                queryClient.invalidateQueries({ queryKey: ['messages', currentUser?.id, selectedUserId] });
                queryClient.invalidateQueries({ queryKey: ['conversations'] }); // Still invalidate conversations
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // Manual scroll
            },

            onError: (err: Error) => {

                toast({

                    title: "Erro ao enviar mensagem",

                    description: err.message,

                    variant: "destructive"

                });

            },

        });

        

        // Mark messages as read when a chat is opened

        useEffect(() => {

            if (selectedUserId) {

                supabase.rpc('mark_messages_as_read', { p_sender_id: selectedUserId }).then(() => {

                    queryClient.invalidateQueries({ queryKey: ['conversations'] });

                });

            }

        }, [selectedUserId, queryClient]);

    

                // Real-time subscription for new messages

    

                useEffect(() => {

    

                    if (!currentUser || !selectedUserId) return;

    

        

    

                    // Sort IDs to ensure both users subscribe to the same channel

    

                    const channelName = `dm:${[currentUser.id, selectedUserId].sort().join(':')}`;

    

                    const channel = supabase.channel(channelName)

    

                        .on('postgres_changes', {

    

                            event: 'INSERT',

    

                            schema: 'public',

    

                            table: 'direct_messages',

    

                            // Filter client-side to be sure it's for this conversation

    

                        },

    

                        (payload) => {

    

                            const newMessage = payload.new;

    

                            

    

                            // Only update if the message is relevant to the current conversation

    

                            const isRelevantSender = newMessage.sender_id === selectedUserId && newMessage.receiver_id === currentUser.id;

    

                            const isRelevantReceiver = newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUserId;

    

        

    

                            if (isRelevantSender || isRelevantReceiver) {

    

                                queryClient.setQueryData(['messages', currentUser.id, selectedUserId], (old: any) => {

    

                                    if (!old || !old.pages || old.pages.length === 0) {

    

                                        return { pages: [[newMessage]], pageParams: [undefined] };

    

                                    }

    

                                    const newPages = [...old.pages];

    

                                    newPages[newPages.length - 1] = [...newPages[newPages.length - 1], newMessage]; // Add to the last page

    

                                    return { ...old, pages: newPages };

    

                                });

    

                                queryClient.invalidateQueries({ queryKey: ['conversations'] });

    

        

    

                                // Show toast to receiver if they received a message from the person they are chatting with

    

                                // And the message came from the other user, and this is not the sender's own message

    

                                if (newMessage.receiver_id === currentUser.id && newMessage.sender_id === selectedUserId) {

    

                                    toast({

    

                                        title: `Nova mensagem de ${otherUserProfile?.username || 'alguém'} `,

    

                                        description: newMessage.content,

    

                                    });

    

                                    supabase.rpc('mark_messages_as_read', { p_sender_id: newMessage.sender_id });

    

                                }

    

                            }

    

                        })

    

                        .subscribe();

    

        

    

                    return () => {

    

                        supabase.removeChannel(channel);

    

                    };

    

                }, [currentUser, selectedUserId, queryClient, otherUserProfile, toast]);

    

            

    

            // Scroll to bottom when new messages are added - THIS IS THE CAUSE OF THE PROBLEM

    

            // useEffect(() => {

    

            //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    

            // }, [data]);

    const handleSendMessage = () => {
        const content = newMessage.trim();
        if (content) {
            sendMessageMutation.mutate(content);
        }
    };

    if (!selectedUserId || !currentUser) {
        return <div className="h-full flex items-center justify-center text-muted-foreground"><p>Selecione uma conversa para começar a conversar.</p></div>;
    }
    
    if (isLoadingProfile || isLoadingMessages) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Chat Header */}
            {showHeader && (
              <div className="p-4 border-b border-border flex items-center gap-4">
                  <div className="relative">
                      <Avatar className="h-10 w-10">
                          <AvatarImage src={otherUserProfile?.avatar_url} />
                          <AvatarFallback>{otherUserProfile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {otherUserProfile?.is_online && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                  </div>
                  <h2 className="font-bold text-lg">{otherUserProfile?.username}</h2>
              </div>
            )}

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
                {data?.pages.map(page => page.map(message => (
                    <div key={message.id} className={`flex gap-3 ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        {message.sender_id !== currentUser.id && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={otherUserProfile?.avatar_url} />
                                <AvatarFallback>{otherUserProfile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${message.sender_id === currentUser.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(message.created_at), 'HH:mm')}</p>
                        </div>
                    </div>
                )))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-start gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 resize-none"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <Button type="button" onClick={handleSendMessage} disabled={sendMessageMutation.isPending || !newMessage.trim()}>
                        {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
};
