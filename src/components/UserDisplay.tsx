import { Profile } from "@/hooks/useProfile";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FramedAvatar } from "./FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserDisplayProps {
  // Allow partial profile to support current usages where only some fields are fetched
  profile: Partial<Profile> & { username?: string | null; id?: string; equipped_titles?: any[] | null }; 
  clan?: { tag: string | null } | null;
  showTitles?: boolean;
}

const UserDisplay = ({ profile, clan, showTitles = false }: UserDisplayProps) => {
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
  const equippedTitles = profile.equipped_titles || [];

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="cursor-pointer hover:underline inline-flex items-center gap-2 flex-wrap">
          {clanTag && <span className="font-bold text-primary">[{clanTag}]</span>}
          <span>{username}</span>
          {showTitles && equippedTitles.slice(0, 3).map((title, index) => {
             const name = typeof title === 'string' ? title : title.name;
             const color = typeof title === 'string' ? undefined : title.color;
             const textColor = typeof title === 'string' ? undefined : title.text_color;
             const bgColor = typeof title === 'string' ? undefined : title.background_color;
             return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="rounded-md px-2 py-0.5 text-xs font-normal border-2"
                style={{ 
                  borderColor: color || 'transparent',
                  color: textColor || undefined,
                  backgroundColor: bgColor || undefined
                }}
              >
                {name}
              </Badge>
             );
          })}
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
                 <h4 className="text-lg font-bold leading-none flex items-center gap-2 flex-wrap">
                   {username}
                   {clanTag && <span className="text-sm text-muted-foreground font-semibold">[{clanTag}]</span>}
                   {equippedTitles.length > 0 && (() => {
                      const firstTitle = equippedTitles[0];
                      const name = typeof firstTitle === 'string' ? firstTitle : firstTitle.name;
                      const color = typeof firstTitle === 'string' ? undefined : firstTitle.color;
                      const textColor = typeof firstTitle === 'string' ? undefined : firstTitle.text_color;
                      const bgColor = typeof firstTitle === 'string' ? undefined : firstTitle.background_color;
                      return (
                         <Badge 
                           variant="secondary" 
                           className="rounded-md px-2 py-0.5 text-xs font-normal border-2"
                           style={{ 
                             borderColor: color || 'transparent',
                             color: textColor || undefined,
                             backgroundColor: bgColor || undefined
                           }}
                         >
                           {name}
                         </Badge>
                      );
                   })()}
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