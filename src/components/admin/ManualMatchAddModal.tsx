import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const ManualMatchAddModal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [tournamentId, setTournamentId] = useState<string>("");
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [winnerId, setWinnerId] = useState<string>("none");
  const [player1Score, setPlayer1Score] = useState<string>("0");
  const [player2Score, setPlayer2Score] = useState<string>("0");
  const [roundName, setRoundName] = useState<string>("Fase de Grupos");
  const [isTiebreaker, setIsTiebreaker] = useState<boolean>(false);

  // Fetch Tournaments
  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  // Fetch Participants for selected tournament
  const { data: participants } = useQuery({
    queryKey: ["admin-tournament-participants", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("user_id, profiles(username)")
        .eq("tournament_id", Number(tournamentId));
      if (error) throw error;
      return data.map(p => ({
        user_id: p.user_id,
        username: (p.profiles as any)?.username || "Desconhecido"
      }));
    },
    enabled: !!tournamentId && isOpen
  });

  const addMatchMutation = useMutation({
    mutationFn: async () => {
      if (!tournamentId || !player1Id || !player2Id) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }

      const matchData = {
        tournament_id: Number(tournamentId),
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: winnerId === "none" ? null : winnerId,
        player1_score: Number(player1Score),
        player2_score: Number(player2Score),
        round_name: roundName,
        is_tiebreaker: isTiebreaker,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("tournament_matches")
        .insert(matchData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({
        title: "Sucesso!",
        description: "Confronto adicionado manualmente.",
      });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setPlayer1Id("");
    setPlayer2Id("");
    setWinnerId("none");
    setPlayer1Score("0");
    setPlayer2Score("0");
    setRoundName("Fase de Grupos");
    setIsTiebreaker(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Adicionar Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Confronto Manual</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Torneio</Label>
            <Select onValueChange={setTournamentId} value={tournamentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Torneio" />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jogador 1</Label>
              <Select onValueChange={setPlayer1Id} value={player1Id} disabled={!tournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {participants?.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id || ""}>{p.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jogador 2</Label>
              <Select onValueChange={setPlayer2Id} value={player2Id} disabled={!tournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {participants?.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id || ""}>{p.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Score J1</Label>
              <Input type="number" value={player1Score} onChange={(e) => setPlayer1Score(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Score J2</Label>
              <Input type="number" value={player2Score} onChange={(e) => setPlayer2Score(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vencedor</Label>
            <Select onValueChange={setWinnerId} value={winnerId} disabled={!player1Id || !player2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Vencedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Empate / Nenhum</SelectItem>
                {player1Id && (
                  <SelectItem value={player1Id}>
                    {participants?.find(p => p.user_id === player1Id)?.username} (J1)
                  </SelectItem>
                )}
                {player2Id && (
                  <SelectItem value={player2Id}>
                    {participants?.find(p => p.user_id === player2Id)?.username} (J2)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome da Rodada (Fase)</Label>
            <Input value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="Ex: Fase de Grupos, Oitavas..." />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="tiebreaker" 
              checked={isTiebreaker} 
              onChange={(e) => setIsTiebreaker(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="tiebreaker" className="cursor-pointer">Este confronto é um desempate (Tiebreaker)?</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={() => addMatchMutation.mutate()} disabled={addMatchMutation.isPending || !tournamentId}>
            {addMatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Confronto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
