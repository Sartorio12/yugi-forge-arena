import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, PlusCircle, MinusCircle, Crown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Participant {
  id: number;
  total_wins_in_tournament: number;
  profiles: {
    username: string;
    avatar_url: string;
  } | null;
  decks: {
    id: number;
    deck_name: string;
  } | null;
}

const TournamentManagementPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("title")
        .eq("id", Number(id))
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["tournamentParticipantsManagement", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("id, total_wins_in_tournament, profiles(username, avatar_url), decks(id, deck_name)")
        .eq("tournament_id", Number(id));
      if (error) throw error;
      return data as Participant[];
    },
    enabled: !!id,
  });

  const updateWinsMutation = useMutation({
    mutationFn: async ({ participantId, newWins }: { participantId: number; newWins: number }) => {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ total_wins_in_tournament: newWins })
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Contagem de vitórias atualizada." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Não foi possível atualizar as vitórias: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUpdateWins = (participant: Participant, change: 1 | -1) => {
    const newWins = participant.total_wins_in_tournament + change;
    if (newWins < 0) return;
    updateWinsMutation.mutate({ participantId: participant.id, newWins });
  };

  const isLoading = isLoadingTournament || isLoadingParticipants;

  return (
    <>
      <main className="container mx-auto px-4 py-12">
        <Link to="/dashboard/tournaments">
          <Button variant="ghost" className="mb-8 hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Gerenciar Torneio</CardTitle>
                <CardDescription>{tournament?.title || "Carregando..."}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : participants && participants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogador</TableHead>
                    <TableHead>Decklist</TableHead>
                    <TableHead className="text-center w-[150px]">Vitórias</TableHead>
                    <TableHead className="w-[200px]">Ações</TableHead>
                    <TableHead className="text-right">Deck Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.sort((a, b) => a.id - b.id).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={p.profiles?.avatar_url} alt={p.profiles?.username} />
                            <AvatarFallback>{p.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{p.profiles?.username || "Usuário desconhecido"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.decks ? (
                          <Link to={`/deck/${p.decks.id}`} className="text-primary hover:underline">
                            {p.decks.deck_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xl">
                        {p.total_wins_in_tournament}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-start gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleUpdateWins(p, 1)}
                            disabled={updateWinsMutation.isPending}
                          >
                            <PlusCircle className="h-5 w-5 text-green-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleUpdateWins(p, -1)}
                            disabled={updateWinsMutation.isPending || p.total_wins_in_tournament === 0}
                          >
                            <MinusCircle className="h-5 w-5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.decks ? (
                          <Button asChild variant="outline" size="sm">
                            <Link 
                              to={`/deck/${p.decks.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              Ver Decklist
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Ver Decklist
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  Nenhum participante inscrito neste torneio ainda.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default TournamentManagementPage;
