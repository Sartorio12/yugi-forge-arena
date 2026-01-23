import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { LevelUpModal } from "./LevelUpModal";
import { User } from "@supabase/supabase-js";

export function LevelUpListener({ user }: { user: User | null }) {
  const { profile } = useProfile(user?.id);
  const [showModal, setShowModal] = useState(false);
  const [newLevel, setNewLevel] = useState<number>(0);
  const [rewardUrl, setRewardUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.level) return;

    const storageKey = `user_level_${user.id}`;
    const storedLevelStr = localStorage.getItem(storageKey);
    
    // First run for this user on this device
    if (!storedLevelStr) {
      localStorage.setItem(storageKey, profile.level.toString());
      return;
    }

    const storedLevel = parseInt(storedLevelStr, 10);

    // Check for Level Up
    if (profile.level > storedLevel) {
      // Check for rewards for the NEW level
      const fetchReward = async () => {
        try {
          const { data, error } = await supabase
            .from('frame_rewards')
            .select('frame_url')
            .eq('level_required', profile.level)
            .maybeSingle(); // Use maybeSingle as not every level might have a frame

          if (!error && data) {
            setRewardUrl(data.frame_url);
          } else {
            setRewardUrl(null);
          }
        } catch (e) {
          console.error("Error fetching level reward:", e);
          setRewardUrl(null);
        }
        
        setNewLevel(profile.level);
        setShowModal(true);
        // Update storage immediately to prevent loop if modal logic fails, 
        // OR update it on modal close? 
        // Updating it here is safer against loops, but if user refreshes before seeing modal they miss it.
        // Let's update it here, assuming the modal will show up.
        localStorage.setItem(storageKey, profile.level.toString());
      };

      fetchReward();
    }
  }, [profile?.level, user]);

  return (
    <LevelUpModal 
      isOpen={showModal} 
      onClose={() => setShowModal(false)} 
      newLevel={newLevel}
      rewardFrameUrl={rewardUrl}
    />
  );
}