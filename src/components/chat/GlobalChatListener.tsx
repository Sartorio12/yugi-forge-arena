import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface GlobalChatListenerProps {
    currentUser: User | null;
}

export const GlobalChatListener = ({ currentUser }: GlobalChatListenerProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    
    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Simple chime sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
            
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (error) {
            console.error("Error playing notification sound:", error);
        }
    };

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
                
                // Fetch sender details
                const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', newMessage.sender_id)
                    .single();

                const senderName = senderProfile?.username || 'Alguém';

                // Play sound and show desktop notification if user is tabbed away
                if (document.hidden) {
                    playNotificationSound();
                    
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification(`Nova mensagem de ${senderName}`, {
                                body: newMessage.content,
                                icon: '/favicon.ico'
                            });
                        } catch (e) {
                            console.error("Error showing desktop notification:", e);
                        }
                    }
                }

                console.log("GlobalChatListener: Showing toast from", senderName);

                toast({
                    title: `Nova mensagem de ${senderName}`,
                    description: newMessage.content,
                    action: (
                        <div 
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive cursor-pointer"
                            onClick={() => navigate(`/messages/${newMessage.sender_id}`)}
                        >
                            Responder
                        </div>
                    ),
                });
                
                // Invalidate conversations list so the unread badge (if any) updates
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            })
            .subscribe((status) => {
                console.log("GlobalChatListener: Subscription status:", status);
            });

        return () => {
            console.log("GlobalChatListener: Cleaning up channel");
            supabase.removeChannel(channel);
        };
    }, [currentUser, toast, navigate, queryClient]);

    return null;
};