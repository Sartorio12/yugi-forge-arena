import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

// Define a more detailed type for the profile, including clan information
export type ProfileWithClan = Tables<"profiles"> & {
  clan_members: ({
    clans: Pick<Tables<"clans">, "id" | "name" | "tag"> | null;
  } & Tables<"clan_members">)[]; // It's an array, but should only have one item per user
};


export const useProfile = (userId: string | undefined) => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<ProfileWithClan | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*, clan_members(*, clans(id, name, tag))")
        .eq("id", userId)
        .single();

      if (error) {
        // This handles the case where a user is authenticated but their profile hasn't been created yet.
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      // Normalize clan_members to always be an array
      const normalizedData = { ...data };
      if (normalizedData.clan_members && !Array.isArray(normalizedData.clan_members)) {
        normalizedData.clan_members = [normalizedData.clan_members];
      } else if (!normalizedData.clan_members) {
        normalizedData.clan_members = [];
      }
      return normalizedData;
    },
    enabled: !!userId, // Only run the query if the userId is provided.
  });

  return { profile, isLoading, error };
};
