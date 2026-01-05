import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FramedAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  userId?: string | null;
  frameUrl?: string | null;
  sizeClassName: string; // e.g., "w-32 h-32"
  showFrame?: boolean;
}

export const FramedAvatar = ({ 
  avatarUrl, 
  username, 
  userId, 
  frameUrl: propFrameUrl, 
  sizeClassName, 
  showFrame = true 
}: FramedAvatarProps) => {
  // Only fetch if frameUrl is not provided via props and we have a userId
  const { data: fetchedFrameUrl } = useQuery({
    queryKey: ['user-frame', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('equipped_frame_url')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data?.equipped_frame_url;
    },
    enabled: !!userId && !propFrameUrl && showFrame,
  });

  const finalFrameUrl = propFrameUrl || fetchedFrameUrl;
  const shouldShowFrame = showFrame && finalFrameUrl;
  const isRound = finalFrameUrl?.includes('_round');
  const clippingClass = isRound ? 'rounded-full' : 'clip-hexagon';

  // Specific adjustments for hexagonal frames to fit better horizontally
  const avatarWidthClass = shouldShowFrame ? (isRound ? 'w-[94%]' : 'w-[97%]') : 'w-full';
  const avatarHeightClass = shouldShowFrame ? 'h-[99%]' : 'h-full';

  return (
    <div className={`relative ${sizeClassName} flex items-center justify-center`}>
      <Avatar className={`${avatarWidthClass} ${avatarHeightClass} ${clippingClass} overflow-hidden transition-all duration-300`}>
        <AvatarImage src={avatarUrl ?? undefined} alt={username ?? "Avatar"} className="object-cover w-full h-full" />
        <AvatarFallback>{username?.charAt(0).toUpperCase() ?? "A"}</AvatarFallback>
      </Avatar>

      {shouldShowFrame && (
        <img
          src={finalFrameUrl}
          alt="Moldura"
          className="absolute top-1/2 left-1/2 w-[118%] h-[118%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 max-w-none"
        />
      )}
    </div>
  );
};