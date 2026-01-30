import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles"> & {
  total_wins?: number;
  total_points?: number;
  clan_tag?: string | null;
  clan_name?: string | null;
  clan_id?: number | null;
};

export const useProfile = (userId: string | undefined) => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_profile_stats")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile from user_profile_stats:", error);
        throw error;
      }

      return data as Profile;
    },
    enabled: !!userId,
  });

  return { profile, isLoading, error };
};
