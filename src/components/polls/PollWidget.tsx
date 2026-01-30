import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { PollResults } from "./PollResults";
import { UserSelector } from "./UserSelector";
import { FramedAvatar } from "@/components/FramedAvatar";

interface PollWidgetProps {
  newsPostId: number;
  user: User | null;
}

interface Poll {
  id: number;
  question: string;
  poll_type: 'user_selection' | 'custom';
  max_votes_per_user: number;
  is_active: boolean;
  expires_at: string | null;
}

export const PollWidget = ({ newsPostId, user }: PollWidgetProps) => {
  const queryClient = useQueryClient();
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);

  // 1. Fetch Poll linked to this news post
  const { data: poll, isLoading: isLoadingPoll } = useQuery({
    queryKey: ["poll", newsPostId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("news_post_id", newsPostId)
        .eq("is_active", true)
        .maybeSingle(); // Assuming one active poll per news post
      
      if (error) throw error;
      return data as Poll | null;
    },
  });

  // 2. Fetch User's existing votes to see if they can vote
  const { data: userVotes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ["userVotes", poll?.id, user?.id],
    queryFn: async () => {
      if (!poll || !user) return [];
      const { data, error } = await supabase
        .from("poll_votes")
        .select("candidate_id, option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!poll && !!user,
  });

  const hasVotedMax = userVotes && poll ? userVotes.length >= poll.max_votes_per_user : false;
  const votesRemaining = poll && userVotes ? poll.max_votes_per_user - userVotes.length : 0;
  const isExpired = poll?.expires_at ? new Date(poll.expires_at) < new Date() : false;

  // 3. Mutation to submit votes
  const voteMutation = useMutation({
    mutationFn: async (candidates: any[]) => {
      if (!poll || !user) return;
      
      const promises = candidates.map(candidate => 
        supabase.rpc("vote_for_poll", {
          p_poll_id: poll.id,
          p_candidate_id: candidate.id
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Erro ao votar.");
      }
    },
    onSuccess: () => {
      toast({
        title: "Votos registrados!",
        description: "Obrigado por participar.",
      });
      setSelectedCandidates([]);
      queryClient.invalidateQueries({ queryKey: ["userVotes", poll?.id] });
      queryClient.invalidateQueries({ queryKey: ["pollResults", poll?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao votar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddCandidate = (candidate: any) => {
    if (!poll) return;
    if (selectedCandidates.length >= votesRemaining) {
      toast({
        title: "Limite atingido",
        description: `Você só pode selecionar ${votesRemaining} opções.`,
        variant: "destructive"
      });
      return;
    }
    if (selectedCandidates.find(c => c.id === candidate.id)) {
      return; // Already selected
    }
    setSelectedCandidates([...selectedCandidates, candidate]);
  };

  const handleRemoveCandidate = (id: string) => {
    setSelectedCandidates(selectedCandidates.filter(c => c.id !== id));
  };

  if (isLoadingPoll) return null;
  if (!poll) return null; // No poll for this news

  return (
    <Card className="my-8 border-primary/20 bg-card/50">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-xl md:text-2xl text-primary">{poll.question}</CardTitle>
            <div className="flex gap-2">
                {isExpired && (
                    <Badge variant="destructive">Encerrado</Badge>
                )}
                {user && (
                    <Badge variant={hasVotedMax ? "secondary" : "default"}>
                        {hasVotedMax ? "Votado" : `${userVotes?.length || 0}/${poll.max_votes_per_user} Votos`}
                    </Badge>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Voting Interface */}
        {!hasVotedMax && !isExpired && user && poll.poll_type === 'user_selection' && (
            <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                <h4 className="font-semibold text-sm text-muted-foreground">
                    Selecione até {votesRemaining} jogadores:
                </h4>
                
                <UserSelector 
                    onSelect={handleAddCandidate} 
                    excludeIds={[
                        ...selectedCandidates.map(c => c.id),
                        ...(userVotes?.map(v => v.candidate_id).filter(Boolean) as string[] || []),
                        ...(user?.id ? [user.id] : [])
                    ]}
                    placeholder="Pesquisar jogador para votar..."
                />

                {selectedCandidates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedCandidates.map(candidate => (
                            <div key={candidate.id} className="flex items-center gap-2 bg-secondary/20 p-2 rounded-full border border-border">
                                <FramedAvatar userId={candidate.id} avatarUrl={candidate.avatar_url} sizeClassName="h-6 w-6" />
                                <span className="text-sm font-medium">{candidate.username}</span>
                                <button onClick={() => handleRemoveCandidate(candidate.id)} className="text-muted-foreground hover:text-destructive">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <Button 
                    onClick={() => voteMutation.mutate(selectedCandidates)}
                    disabled={selectedCandidates.length === 0 || voteMutation.isPending}
                    className="w-full"
                >
                    {voteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar {selectedCandidates.length} Voto(s)
                </Button>
            </div>
        )}

        {/* Login Prompt */}
        {!user && (
            <div className="text-center p-4 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground mb-2">Faça login para participar da enquete.</p>
            </div>
        )}

        {/* Results */}
        <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Resultados Parciais
            </h4>
            <PollResults pollId={poll.id} />
        </div>

      </CardContent>
    </Card>
  );
};
