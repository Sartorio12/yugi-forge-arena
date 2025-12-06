import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, PlusCircle, MinusCircle, Crown, UserX, FileSearch } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDisplay from "@/components/UserDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Profile } from "@/hooks/useProfile";
import { supabase } from '../../integrations/supabase/client';
import { useEffect } from "react";

// Updated to match the RPC return type
interface ParticipantDeck {
  user_id: string;
  deck_id: number;
  deck_snapshot_id: number;
  deck_name: string | null;
}

interface Participant {
  id: number;
  user_id: string;
  total_wins_in_tournament: number;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    banner_url: string | null;
    level: number;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    } | null;
  } | null;
}



const TournamentManagementPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("title, organizer_id, exclusive_organizer_only")
        .eq("id", Number(id))
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (tournament) {
        const t = tournament as any;
        if (t.exclusive_organizer_only) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || user.id !== t.organizer_id) {
            toast({
              title: "Acesso Negado",
              description: "Este torneio é exclusivo do organizador. Você não tem permissão para gerenciá-lo.",
              variant: "destructive",
            });
            navigate("/dashboard/tournaments");
          }
        }
      }
    };
    checkAccess();
  }, [tournament, navigate]);

  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["tournamentParticipantsManagement", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select(`
          id,
          user_id,
          total_wins_in_tournament,
          profiles (
            id,
            username,
            avatar_url,
            banner_url,
            level,
            clan_members (
              clans (
                tag
              )
            )
          )
        `)
        .eq("tournament_id", Number(id));

      if (error) {
        throw error;
      }
      console.log('Participants Data:', data?.[0]?.profiles);
      return data as Participant[];
    },
    enabled: !!id,
  });

  const { data: allDecks, isLoading: isLoadingDecks } = useQuery({
    queryKey: ["tournamentDecksForAdmin", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tournament_decks_for_admin', { 
        p_tournament_id: Number(id) 
      });
      
      if (error) {
          console.error("Error fetching tournament decks via RPC:", error);
          throw error;
      }
      console.log("All tournament decks data (RPC):", data);
      return data as ParticipantDeck[];
    },
    enabled: !!id,
  });

  const decksByUserId = new Map<string, ParticipantDeck[]>();
  if (allDecks) {
    for (const deck of allDecks) {
      if (deck.user_id && !decksByUserId.has(deck.user_id)) {
        decksByUserId.set(deck.user_id, []);
      }
      if (deck.user_id) {
        decksByUserId.get(deck.user_id)!.push(deck);
      }
    }
  }

  const updateWinsMutation = useMutation({
    mutationFn: async ({ participantId, change, userId }: { participantId: number; change: number; userId: string }) => {
      const { error } = await supabase.rpc('update_player_wins', {
        p_participant_id: participantId,
        p_win_change: change
      });
      if (error) throw error;
      return { userId }; // Pass userId to onSuccess
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso", description: "Contagem de vitórias atualizada." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
      queryClient.invalidateQueries({ queryKey: ["profile", data.userId] });
      queryClient.invalidateQueries({ queryKey: ["topRankedPlayers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Não foi possível atualizar as vitórias: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const { error } = await supabase
        .from("tournament_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Participante removido do torneio." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Não foi possível remover o participante: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUpdateWins = (participant: Participant, change: 1 | -1) => {
    // No longer calculating newWins here to prevent race conditions
    updateWinsMutation.mutate({ participantId: participant.id, change, userId: participant.user_id });
  };

  const handleRemoveParticipant = (participantId: number) => {
    removeParticipantMutation.mutate(participantId);
  };

  const isLoading = isLoadingTournament || isLoadingParticipants || isLoadingDecks;

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
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead>Decklist</TableHead>
                    <TableHead className="text-center w-[150px]">Vitórias</TableHead>
                    <TableHead className="w-[250px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.sort((a, b) => a.id - b.id).map((p, index) => {
                    const userDecks = decksByUserId.get(p.user_id);
                    const hasDecks = userDecks && userDecks.length > 0;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarImage src={p.profiles?.avatar_url || undefined} alt={p.profiles?.username || "Usuário desconhecido"} />
                              <AvatarFallback>{p.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              <Link to={`/profile/${p.profiles?.id}`}>
                                <UserDisplay profile={p.profiles || {}} clan={p.profiles?.clan_members?.clans} />
                              </Link>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasDecks ? (
                              <span className="text-green-500 font-semibold">Enviada</span>
                          ) : (
                              <span className="text-muted-foreground">Pendente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xl">
                          {p.total_wins_in_tournament}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start gap-2">
                            {hasDecks && userDecks && (
                               <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="outline" size="icon">
                                   <FileSearch className="h-5 w-5" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent>
                                 {userDecks.map(dl => (
                                   <DropdownMenuItem key={dl.deck_id} asChild>
                                     <Link to={`/deck/${dl.deck_id}?snapshot_id=${dl.deck_snapshot_id}`} target="_blank" rel="noopener noreferrer">
                                       {dl.deck_name || 'Deck sem nome'}
                                     </Link>
                                   </DropdownMenuItem>
                                 ))}
                               </DropdownMenuContent>
                             </DropdownMenu>
                            )}
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={removeParticipantMutation.isPending}>
                                  <UserX className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação removerá o participante {p.profiles?.username} do torneio.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveParticipant(p.id)}>
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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