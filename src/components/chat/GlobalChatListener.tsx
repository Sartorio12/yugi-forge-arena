import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useChat } from './ChatProvider';

interface GlobalChatListenerProps {
    currentUser: User | null;
}

export const GlobalChatListener = ({ currentUser }: GlobalChatListenerProps) => {
    const { toast } = useToast();
    const { openChats, openChat } = useChat();
    const queryClient = useQueryClient();
    
    // Use a ref to track openChats to avoid re-subscribing on every state change
    const openChatsRef = useRef(openChats);

    useEffect(() => {
        openChatsRef.current = openChats;
    }, [openChats]);

    useEffect(() => {
        if (!currentUser) return;

        console.log("GlobalChatListener: Subscribing to messages for user", currentUser.id);

        const channel = supabase.channel(`global_messages:${currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'direct_messages',
                filter: `receiver_id=eq.${currentUser.id}`
            },
            async (payload) => {
                console.log("GlobalChatListener: Message received!", payload);
                const newMessage = payload.new;
                
                // Check if we already have an open chat window for this sender
                // Use the ref to get the latest state without triggering re-subscription
                const isChatOpen = openChatsRef.current.some(c => c.userId === newMessage.sender_id);
                console.log("GlobalChatListener: isChatOpen?", isChatOpen, "Sender:", newMessage.sender_id);

                if (!isChatOpen) {
                    // Fetch sender details for the toast
                    const { data: senderProfile } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', newMessage.sender_id)
                        .single();

                    const senderName = senderProfile?.username || 'Alguém';
                    console.log("GlobalChatListener: Showing toast from", senderName);

                    toast({
                        title: `Nova mensagem de ${senderName}`,
                        description: newMessage.content,
                        action: (
                            <div 
                                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive cursor-pointer"
                                onClick={() => openChat(newMessage.sender_id)}
                            >
                                Responder
                            </div>
                        ),
                    });
                    
                    // Invalidate conversations list so the unread badge (if any) updates
                     queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }
            })
            .subscribe((status) => {
                console.log("GlobalChatListener: Subscription status:", status);
            });

        return () => {
            console.log("GlobalChatListener: Cleaning up channel");
            supabase.removeChannel(channel);
        };
    }, [currentUser, toast, openChat, queryClient]); // Removed openChats from dependencies

    return null;
};
