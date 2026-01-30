import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Trophy } from "lucide-react";

interface PollResult {
  candidate_id: string | null;
  option_id: number | null;
  vote_count: number;
  candidate_name: string | null;
  candidate_avatar: string | null;
  option_label: string | null;
}

interface PollResultsProps {
  pollId: number;
}

export const PollResults = ({ pollId }: PollResultsProps) => {
  const queryClient = useQueryClient();

  const { data: results, isLoading } = useQuery({
    queryKey: ["pollResults", pollId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_poll_results", {
        p_poll_id: pollId,
      });
      if (error) throw error;
      return data as PollResult[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`poll_votes_${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pollResults", pollId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, queryClient]);

  if (isLoading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;

  const totalVotes = results?.reduce((acc, curr) => acc + curr.vote_count, 0) || 0;
  const maxVotes = Math.max(...(results?.map((r) => r.vote_count) || [0]));

  return (
    <div className="space-y-4">
      {results && results.length > 0 ? (
        results.map((result, index) => {
          const percentage = totalVotes > 0 ? (result.vote_count / totalVotes) * 100 : 0;
          const isTop = index === 0 && result.vote_count > 0;
          
          return (
            <div key={result.candidate_id || result.option_id} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                   {isTop && <Trophy className="h-4 w-4 text-yellow-500" />}
                   {result.candidate_id ? (
                      <div className="flex items-center gap-2">
                        <FramedAvatar 
                           avatarUrl={result.candidate_avatar} 
                           username={result.candidate_name || ""} 
                           sizeClassName="h-6 w-6" 
                        />
                        <span className={`font-medium ${isTop ? "text-primary font-bold" : ""}`}>
                            {result.candidate_name}
                        </span>
                      </div>
                   ) : (
                      <span className="font-medium">{result.option_label}</span>
                   )}
                </div>
                <span className="text-sm font-semibold">
                    {result.vote_count} {result.vote_count === 1 ? 'voto' : 'votos'}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })
      ) : (
        <p className="text-muted-foreground text-center py-4">Nenhum voto registrado ainda.</p>
      )}
    </div>
  );
};
