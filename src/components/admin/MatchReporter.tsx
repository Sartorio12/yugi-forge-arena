import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Swords, Trophy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface MatchReporterProps {
  tournamentId: string;
}

export const MatchReporter = ({ tournamentId }: MatchReporterProps) => {
  const queryClient = useQueryClient();
  const [player1, setPlayer1] = useState<string>("");
  const [player2, setPlayer2] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [roundName, setRoundName] = useState<string>("");

  // Fetch participants
  const { data: participants, isLoading } = useQuery({
    queryKey: ["tournament-participants", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("user_id, profiles(username, clan_members(clans(tag)))")
        .eq("tournament_id", Number(tournamentId));

      if (error) throw error;
      return data;
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!player1 || !player2 || !winner) throw new Error("Preencha todos os campos obrigatórios.");
      if (player1 === player2) throw new Error("Os jogadores devem ser diferentes.");

      const { error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: Number(tournamentId),
          player1_id: player1,
          player2_id: player2,
          winner_id: winner,
          round_name: roundName || "Rodada Regular",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Partida registrada com sucesso!" });
      setPlayer1("");
      setPlayer2("");
      setWinner("");
      setRoundName("");
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
    },
    onError: (err) => {
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Swords className="text-primary" /> Registrar Confronto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Jogador 1</label>
                <Select value={player1} onValueChange={setPlayer1}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                    {participants?.map((p) => {
                       const tag = (p.profiles as any)?.clan_members?.clans?.tag;
                       return (
                        <SelectItem key={p.user_id} value={p.user_id}>
                            {tag ? `[${tag}] ` : ""}{p.profiles?.username}
                        </SelectItem>
                       );
                    })}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Jogador 2</label>
                <Select value={player2} onValueChange={setPlayer2}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                    {participants?.filter(p => p.user_id !== player1).map((p) => {
                       const tag = (p.profiles as any)?.clan_members?.clans?.tag;
                       return (
                        <SelectItem key={p.user_id} value={p.user_id}>
                            {tag ? `[${tag}] ` : ""}{p.profiles?.username}
                        </SelectItem>
                       );
                    })}
                </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Vencedor</label>
                <Select value={winner} onValueChange={setWinner} disabled={!player1 || !player2}>
                <SelectTrigger>
                    <SelectValue placeholder="Quem venceu?" />
                </SelectTrigger>
                <SelectContent>
                    {player1 && participants?.find(p => p.user_id === player1) && (() => {
                        const p = participants.find(p => p.user_id === player1);
                        const tag = (p?.profiles as any)?.clan_members?.clans?.tag;
                        return (
                            <SelectItem value={player1}>{tag ? `[${tag}] ` : ""}{p?.profiles?.username}</SelectItem>
                        );
                    })()}
                    {player2 && participants?.find(p => p.user_id === player2) && (() => {
                        const p = participants.find(p => p.user_id === player2);
                        const tag = (p?.profiles as any)?.clan_members?.clans?.tag;
                        return (
                             <SelectItem value={player2}>{tag ? `[${tag}] ` : ""}{p?.profiles?.username}</SelectItem>
                        );
                    })()}
                </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Fase / Rodada</label>
                <Input 
                    placeholder="Ex: Top 8, Final, Rodada 1..." 
                    value={roundName} 
                    onChange={(e) => setRoundName(e.target.value)} 
                />
            </div>
        </div>

        <Button 
            className="w-full" 
            onClick={() => reportMutation.mutate()} 
            disabled={reportMutation.isPending || !player1 || !player2 || !winner}
        >
            {reportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trophy className="mr-2 h-4 w-4" /> Registrar Vitória
        </Button>
      </CardContent>
    </Card>
  );
};
