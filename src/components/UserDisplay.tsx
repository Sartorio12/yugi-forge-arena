import { Profile } from "@/hooks/useProfile";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FramedAvatar } from "./FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface UserDisplayProps {
  // Allow partial profile to support current usages where only some fields are fetched
  profile: Partial<Profile> & { username?: string | null; id?: string }; 
  clan?: { tag: string | null } | null;
}

const UserDisplay = ({ profile, clan }: UserDisplayProps) => {
  if (!profile) {
    return null;
  }

  const clanTag = clan?.tag;
  const username = profile.username || "Usuário desconhecido";
  const avatarUrl = profile.avatar_url;
  // Access properties safely. If types are updated, these casts can be removed.
  // Defaulting level to 1 if not present/fetched yet.
  const level = (profile as any).level || 1; 
  const bannerUrl = (profile as any).banner_url;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer hover:underline inline-flex items-center gap-1">
          {clanTag && <span className="font-bold text-primary">[{clanTag}]</span>}
          <span>{username}</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden border-border" side="top">
         {/* Banner Area */}
         <div className="h-24 w-full bg-muted relative">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/40 to-secondary/40" />
            )}
         </div>
         
         <div className="px-4 pb-4 pt-0 relative">
            <div className="flex justify-between items-end -mt-10 mb-3">
               <FramedAvatar
                  avatarUrl={avatarUrl}
                  frameUrl={(profile as any).equipped_frame_url}
                  username={username}
                  sizeClassName="h-20 w-20"
                />
            </div>
            
            <div className="space-y-2">
               <div>
                 <h4 className="text-lg font-bold leading-none flex items-center gap-2">
                   {username}
                   {clanTag && <span className="text-sm text-muted-foreground font-semibold">[{clanTag}]</span>}
                 </h4>
               </div>
               
               <div className="flex items-center p-2 bg-secondary/20 rounded-md">
                  <Trophy className="mr-3 h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Nível de Duelista</p>
                    <p className="font-bold text-lg">{level}</p>
                  </div>
               </div>
            </div>
         </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserDisplay;