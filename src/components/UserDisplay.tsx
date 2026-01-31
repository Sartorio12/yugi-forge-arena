import { Profile, useProfile } from "@/hooks/useProfile";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FramedAvatar } from "./FramedAvatar";
import { Trophy, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface UserDisplayProps {
  // Allow partial profile to support current usages where only some fields are fetched
  profile: Partial<Profile> & { username?: string | null; id?: string; equipped_titles?: any[] | null }; 
  clan?: { tag: string | null } | null;
  showTitles?: boolean;
}

const UserCardDetails = ({ initialProfile, clan }: { initialProfile: UserDisplayProps['profile'], clan: UserDisplayProps['clan'] }) => {
  const { t } = useTranslation();
  
  // Robust ID extraction (some views use user_id, some use id)
  const userId = initialProfile.id || (initialProfile as any).user_id;
  
  // Fetch full profile details when this component is mounted (on hover)
  // This ensures we have the latest banner, titles, etc. without over-fetching in lists
  const { profile: fullProfile } = useProfile(userId);
  
  // Merge initial profile with full profile (full profile takes precedence if loaded)
  const displayProfile = fullProfile || initialProfile;

  const username = displayProfile.username || t('user_display.unknown');
  const avatarUrl = displayProfile.avatar_url;
  const level = (displayProfile as any).level || 1;
  const bannerUrl = (displayProfile as any).banner_url;
  // equipped_titles might be string[] or JSONB array. 
  // In fullProfile (from DB), it is JSONB. In initialProfile, it might be whatever was passed.
  // We handle both in rendering.
  const equippedTitles = (displayProfile as any).equipped_titles || [];
  const clanTag = clan?.tag; // Clan might come from separate query in parent, keep it

  return (
    <div className="w-80 p-0 overflow-hidden border-border">
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
                  frameUrl={(displayProfile as any).equipped_frame_url}
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
                      // Handle both string[] (legacy/partial) and object[] (JSONB)
                      const firstTitle = equippedTitles[0];
                      const name = typeof firstTitle === 'string' ? firstTitle : firstTitle.name;
                      const color = typeof firstTitle === 'string' ? undefined : firstTitle.color; // border color alias or explicit
                      const borderColor = typeof firstTitle === 'string' ? undefined : (firstTitle.border_color || firstTitle.color);
                      const textColor = typeof firstTitle === 'string' ? undefined : firstTitle.text_color;
                      const bgColor = typeof firstTitle === 'string' ? undefined : firstTitle.background_color;
                      
                      return (
                         <Badge 
                           variant="secondary" 
                           className="rounded-md px-2 py-0.5 text-xs font-normal border-2"
                           style={{ 
                             borderColor: borderColor || 'transparent',
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
               
               <div className="grid grid-cols-2 gap-2 mt-4">
                 <div className="flex items-center p-2 bg-secondary/20 rounded-md">
                    <Trophy className="mr-3 h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">{t('user_display.duelist_level')}</p>
                      <p className="font-bold text-lg leading-tight">{level}</p>
                    </div>
                 </div>

                 <div className="flex items-center p-2 bg-primary/10 rounded-md border border-primary/20">
                    <Swords className="mr-3 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">{t('ranking_page.wins')}</p>
                      <p className="font-bold text-lg leading-tight">{(displayProfile as any).total_wins || 0}</p>
                    </div>
                 </div>
               </div>

               {(displayProfile as any).discord_username && (
                 <div className="text-xs text-muted-foreground mt-2 pb-2">
                   <span className="text-[#5865F2] font-semibold">Discord:</span> {(displayProfile as any).discord_username}
                 </div>
               )}
            </div>
         </div>
    </div>
  );
};

const UserDisplay = ({ profile, clan, showTitles = false }: UserDisplayProps) => {
  const { t } = useTranslation();
  if (!profile) {
    return null;
  }

  const clanTag = clan?.tag;
  const username = profile.username || t('user_display.unknown');
  const equippedTitles = profile.equipped_titles || [];

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={`cursor-pointer hover:underline inline-flex items-center gap-2 flex-wrap ${showTitles ? 'flex-col md:flex-row' : ''}`}>
          <div className="flex items-center gap-2">
            {clanTag && <span className="font-bold text-primary">[{clanTag}]</span>}
            <span>{username}</span>
          </div>
          {showTitles && equippedTitles.slice(0, 3).map((title, index) => {
             const name = typeof title === 'string' ? title : title.name;
             const borderColor = typeof title === 'string' ? undefined : (title.border_color || title.color);
             const textColor = typeof title === 'string' ? undefined : title.text_color;
             const bgColor = typeof title === 'string' ? undefined : title.background_color;
             return (
              <Badge 
                key={index} 
                variant="secondary" 
                className="rounded-md px-2 py-0.5 text-xs font-normal border-2"
                style={{ 
                  borderColor: borderColor || 'transparent',
                  color: textColor || undefined,
                  backgroundColor: bgColor || undefined
                }}
              >
                {name}
              </Badge>
             );
          })}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden border-border" side="top">
         <UserCardDetails initialProfile={profile} clan={clan} />
      </HoverCardContent>
    </HoverCard>
  );
};

export default UserDisplay;
