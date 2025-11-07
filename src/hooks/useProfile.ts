import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export const useProfile = (userId: string | undefined) => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Tables<"profiles"> | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // This handles the case where a user is authenticated but their profile hasn't been created yet.
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: !!userId, // Only run the query if the userId is provided.
  });

  return { profile, isLoading, error };
};
