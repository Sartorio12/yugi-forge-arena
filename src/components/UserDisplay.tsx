import { Profile } from "@/hooks/useProfile";
import { Tables } from "@/integrations/supabase/types";

interface UserDisplayProps {
  profile: Profile;
  clan?: Tables<"clans"> | null;
}

const UserDisplay = ({ profile, clan }: UserDisplayProps) => {
  if (!profile) {
    return null;
  }

  const clanTag = clan?.tag;

  return (
    <span>
      {clanTag && `[${clanTag}] `}
      {profile.username}
    </span>
  );
};

export default UserDisplay;
