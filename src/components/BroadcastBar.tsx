import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Broadcast {
  id: number;
  is_active: boolean;
  platform: 'twitch' | 'youtube';
  channel_id: string;
  title: string;
}

export const BroadcastBar = () => {
  const [isVisible, setIsVisible] = useState(true);
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

  const renderEmbed = () => {
    if (platform === 'twitch') {
      // Twitch requires parent parameter.
      // If localhost, use 'localhost'.
      // If ip, use ip.
      // We pass the current hostname.
      const parentDomain = hostname === 'localhost' ? 'localhost' : hostname;
      return (
        <iframe
          src={`https://player.twitch.tv/?channel=${channel_id}&parent=${parentDomain}&muted=false`}
          className="w-full h-full aspect-video"
          allowFullScreen
          title="Twitch Stream"
        />
      );
    }
    if (platform === 'youtube') {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${channel_id}?autoplay=1`}
          className="w-full h-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Stream"
        />
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
            <span className="text-red-500 font-bold text-sm tracking-wider">AO VIVO</span>
          </div>

          {/* Center/Right: Title */}
          <div className="flex-1 text-center md:text-left md:pl-4 truncate">
            <span className="text-white font-medium text-sm md:text-base">
              {title || "Transmissão Especial"}
            </span>
          </div>

          {/* Right: Close Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Player Container */}
        <div className="w-full aspect-video bg-black">
          {renderEmbed()}
        </div>
      </div>
    </div>
  );
};
