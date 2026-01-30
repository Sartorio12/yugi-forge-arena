import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, MessageSquare, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Broadcast {
  id: number;
  is_active: boolean;
  platform: 'twitch' | 'youtube';
  channel_id: string;
  title: string;
}

export const BroadcastBar = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const { data: broadcast, isLoading } = useQuery({
    queryKey: ["active-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("id", 1) // Assuming single managed broadcast for now
        .single();
      
      if (error) return null;
      return data as Broadcast;
    },
  });

  if (isLoading || !broadcast || !broadcast.is_active || !isVisible) {
    return null;
  }

  const { platform, channel_id, title } = broadcast;
  const parentDomain = hostname === 'localhost' ? 'localhost' : hostname;

  const renderContent = () => {
    if (platform === 'twitch') {
      return (
        <div className="flex w-full flex-col lg:flex-row lg:h-full">
          <div className="relative w-full aspect-video lg:aspect-auto lg:flex-1 lg:h-full bg-black">
            <iframe
              src={`https://player.twitch.tv/?channel=${channel_id}&parent=${parentDomain}&muted=false`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              title="Twitch Stream"
            />
          </div>
          {showChat && (
            <div className="w-full h-[400px] lg:w-[400px] lg:h-full border-t lg:border-t-0 lg:border-l border-white/10 bg-zinc-900">
              <iframe
                src={`https://www.twitch.tv/embed/${channel_id}/chat?parent=${parentDomain}&darkpopout`}
                className="w-full h-full"
                title="Twitch Chat"
              />
            </div>
          )}
        </div>
      );
    }
    if (platform === 'youtube') {
      if (!channel_id) return null;
      
      const isChannelId = channel_id.startsWith("UC") && channel_id.length > 20;
      const origin = window.location.origin;
      const domain = window.location.hostname;
      
      const src = isChannelId
        ? `https://www.youtube.com/embed/live_stream?channel=${channel_id}&autoplay=1&origin=${origin}`
        : `https://www.youtube.com/embed/${channel_id}?autoplay=1&origin=${origin}`;

      return (
        <div className="flex w-full flex-col lg:flex-row lg:h-full">
          <div className="relative w-full aspect-video lg:aspect-auto lg:flex-1 lg:h-full bg-black">
            <iframe
              src={src}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Stream"
            />
          </div>
          {/* Only show chat for specific video IDs, not channel IDs (unless we have a way to get video ID) */}
          {!isChannelId && showChat && (
            <div className="w-full h-[400px] lg:w-[400px] lg:h-full border-t lg:border-t-0 lg:border-l border-white/10 bg-zinc-900">
              <iframe
                src={`https://www.youtube.com/live_chat?v=${channel_id}&embed_domain=${domain}`}
                className="w-full h-full"
                title="YouTube Chat"
              />
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mb-8 animate-in slide-in-from-top duration-700 ease-out">
      <div className="relative w-full overflow-hidden rounded-lg border border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] bg-black">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-primary/20 via-black to-black border-b border-primary/20">
          
          {/* Left: Live Indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-500 font-bold text-sm tracking-wider">{t('broadcast_bar.live')}</span>
          </div>

          {/* Center/Right: Title */}
          <div className="flex-1 text-center md:text-left md:pl-4 truncate px-2">
            <span className="text-white font-medium text-sm md:text-base">
              {title || t('broadcast_bar.special')}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={() => setShowChat(!showChat)}
              title={showChat ? t('broadcast_bar.hide_chat') : t('broadcast_bar.show_chat')}
            >
              {showChat ? <MessageSquareOff className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Player Container - Increased height for better fit */}
        <div className="w-full md:h-[55vh] bg-black">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
