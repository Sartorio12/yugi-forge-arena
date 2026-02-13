import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface PresenceProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export const PresenceProvider = ({ user, children }: PresenceProviderProps) => {

  // Crowdsourced Cleanup:
  // Every time a user visits the site, we trigger a cleanup of inactive users.
  // This acts as a distributed "cron job" to keep the online list fresh.
  useEffect(() => {
    const runCleanup = async () => {
        // Add a small random delay to prevent thundering herd if many users join at once
        // and simple probability check to reduce write load (e.g., run 20% of the time)
        if (Math.random() < 0.2) {
            try {
                await supabase.rpc('cleanup_inactive_users');
            } catch (error) {
                console.error("Failed to run inactive user cleanup:", error);
            }
        }
    };
    runCleanup();
  }, []);

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

        // Send a heartbeat every 5 minutes to keep `last_seen` fresh
        intervalId = setInterval(async () => {
          await updateUserStatus(true);
        }, 300000);
      }
    });

    const handleBeforeUnload = () => {
        // Attempt to set offline status before page unload
        // Note: This is best-effort as async calls may be cancelled by the browser
        const payload = { is_online: false, last_seen: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
            blob
        );
        // Also try the standard method in case it works
        updateUserStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
