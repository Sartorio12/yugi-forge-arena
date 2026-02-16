import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Trash2, Loader2, Users, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FramedAvatar } from "@/components/FramedAvatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame_url: string | null;
    role: string | null;
  } | null;
}

interface OnlineUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string | null;
}

export const GlobalChat = ({ user }: { user: any }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showOnlineList, setShowOnlineUsers] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isSuperAdmin = user?.id === "80193776-6790-457c-906d-ed45ea16df9f";
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin' || userProfile?.role === 'super-admin' || userProfile?.role === 'organizer';

  useEffect(() => {
    fetchMessages();
    if (user) fetchUserProfile();

    // Subscribe to REALTIME changes and Presence
    const channel = supabase.channel('global_chat_channel', {
      config: {
        presence: {
          key: user?.id || 'anonymous',
        },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            handleNewRealtimeMessage(payload.new as any);
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        handlePresenceSync(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Option to show "User joined" toast if desired
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Option to handle leave
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          // Fetch current profile to share in presence
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, role')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            await channel.track({
              user_id: user.id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              role: profile.role
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePresenceSync = (presenceState: any) => {
    const users: OnlineUser[] = [];
    Object.keys(presenceState).forEach((key) => {
      presenceState[key].forEach((presence: any) => {
        if (presence.user_id && !users.some(u => u.user_id === presence.user_id)) {
          users.push({
            user_id: presence.user_id,
            username: presence.username,
            avatar_url: presence.avatar_url,
            role: presence.role
          });
        }
      });
    });
    setOnlineUsers(users);
  };

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (data) setUserProfile(data);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('global_messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles (
            username,
            avatar_url,
            equipped_frame_url,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data?.reverse() || []);
    } catch (error: any) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRealtimeMessage = async (newMsg: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, equipped_frame_url, role')
      .eq('id', newMsg.user_id)
      .single();

    const fullMessage: Message = {
      ...newMsg,
      profiles: profile
    };

    setMessages(prev => {
      if (prev.some(m => m.id === fullMessage.id)) return prev;
      const updated = [...prev, fullMessage];
      return updated.slice(-50);
    });
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Ação necessária", description: "Faça login para enviar mensagens.", variant: "destructive" });
      return;
    }
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('global_messages')
        .insert([{
          user_id: user.id,
          content: newMessage.trim()
        }]);

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm("Deletar esta mensagem?")) return;
    try {
      const { error } = await supabase
        .from('global_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-black/40 border-white/5 shadow-2xl flex flex-col h-[500px] overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <CardTitle className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Chat Geral
          </CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
            <Users className="w-3 h-3" />
            {onlineUsers.length} Online
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-white"
            onClick={() => setShowOnlineUsers(!showOnlineList)}
          >
            {showOnlineList ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-row min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 opacity-30 text-xs uppercase font-bold tracking-widest">
                  Nenhuma mensagem enviada ainda...
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="group flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="shrink-0 mt-1">
                      <FramedAvatar 
                        userId={msg.user_id}
                        username={msg.profiles?.username}
                        avatarUrl={msg.profiles?.avatar_url}
                        sizeClassName="h-8 w-8"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                                                  <span className={cn(
                                                    "text-[11px] font-black uppercase tracking-tighter",
                                                    (msg.profiles?.role === 'super-admin' || msg.profiles?.role === 'organizer' || msg.user_id === '80193776-6790-457c-906d-ed45ea16df9f') ? "text-yellow-500" : 
                                                    msg.profiles?.role === 'admin' ? "text-red-400" : "text-[#a855f7]"
                                                  )}>
                          
                            {msg.profiles?.username || "Usuário"}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-300 leading-relaxed break-words mt-0.5">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/20 flex gap-2">
            <Input 
              placeholder={user ? "Escreva uma mensagem..." : "Faça login para falar no chat"}
              className="bg-white/5 border-white/10 h-10 text-sm focus-visible:ring-primary/30"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user || isSending}
              maxLength={500}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="shrink-0 bg-primary hover:bg-primary/90 text-black h-10 w-10 shadow-lg shadow-primary/20"
              disabled={!user || !newMessage.trim() || isSending}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>

        {/* Collapsible Online Users Sidebar */}
        <div className={cn(
          "border-l border-white/5 bg-white/5 transition-all duration-300 overflow-hidden flex flex-col",
          showOnlineList ? "w-48" : "w-0"
        )}>
          <div className="p-3 border-b border-white/5 bg-black/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Online agora</h4>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {onlineUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-2 group cursor-default">
                  <div className="relative">
                    <img 
                      src={u.avatar_url || "/placeholder.svg"} 
                      alt={u.username} 
                      className="h-6 w-6 rounded-full border border-white/10 object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-black" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase truncate",
                    (u.role === 'super-admin' || u.role === 'organizer' || u.user_id === '80193776-6790-457c-906d-ed45ea16df9f') ? "text-yellow-500" : 
                    u.role === 'admin' ? "text-red-400" : "text-[#a855f7]"
                  )}>
                    {u.username}
                  </span>
                </div>
              ))}
              {onlineUsers.length === 0 && (
                <div className="text-[9px] text-center text-muted-foreground uppercase italic py-4">
                  Ninguém online
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
