import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface PresenceProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export const PresenceProvider = ({ user, children }: PresenceProviderProps) => {

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase.channel(`user-presence:${user.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    let intervalId: NodeJS.Timeout;

    const updateUserStatus = async (isOnline: boolean) => {
      await supabase.from('profiles').update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      }).eq('id', user.id);
    };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // User is online
        await channel.track({ online_at: new Date().toISOString() });
        await updateUserStatus(true);

        // Send a heartbeat every 60 seconds to keep `last_seen` fresh
        intervalId = setInterval(async () => {
          await updateUserStatus(true);
        }, 60000);
      }
    });

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      if (channel) {
        // Set user offline on unmount/cleanup
        updateUserStatus(false);
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  return <>{children}</>;
};
