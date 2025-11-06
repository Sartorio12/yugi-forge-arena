import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/integrations/supabase/types";

export const useProfile = (user: User | null) => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Tables<"profiles"> | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
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
    enabled: !!user, // Only run the query if the user object exists.
  });

  return { profile, isLoading, error };
};
