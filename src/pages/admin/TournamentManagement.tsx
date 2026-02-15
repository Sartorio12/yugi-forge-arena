import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, PlusCircle, MinusCircle, Crown, UserX, FileSearch, Copy, UserPlus, Search, LayoutDashboard, Swords, Settings, ShieldAlert, Shuffle, Users2, Trophy, RotateCcw, Layers } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { FramedAvatar } from "@/components/FramedAvatar";
import UserDisplay from "@/components/UserDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '../../integrations/supabase/client';
import { useEffect, useState } from "react";
import { getTeamLogoUrl } from "@/constants/teams";
import { User } from "@supabase/supabase-js";
import { MatchReporter } from "@/components/admin/MatchReporter";
import { generateSwissPairings } from "@/lib/swissPairing"; // Import the helper

// Types
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
  team_selection?: string;
  group_name?: string;
  checked_in: boolean;
  is_disqualified: boolean;
  profiles: {
    id: string;
    username: string;
    discord_username: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    level: number;
    equipped_frame_url: string | null;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    }[] | any;
  } | null;
}

interface Match {
  id: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  round_name: string;
  round_number: number;
  player1_score: number;
  player2_score: number;
  is_wo: boolean;
  player1?: { username: string; avatar_url?: string; clan_members?: { clans: { tag: string } }[] } | any;
  player2?: { username: string; avatar_url?: string; clan_members?: { clans: { tag: string } }[] } | any;
}

const MatchCard = ({ match, onUpdate, isPending }: { match: Match, onUpdate: (winnerId: string | null, isWO: boolean, s1: number, s2: number) => void, isPending: boolean }) => {
    const [score1, setScore1] = useState(match.player1_score || 0);
    const [score2, setScore2] = useState(match.player2_score || 0);
    const [isWO, setIsWO] = useState(match.is_wo || false);

    useEffect(() => {
        setScore1(match.player1_score || 0);
        setScore2(match.player2_score || 0);
        setIsWO(match.is_wo || false);
    }, [match.player1_score, match.player2_score, match.is_wo]);

    // Derived winner based on scores
    const currentWinnerId = score1 > score2 ? match.player1_id : (score2 > score1 ? match.player2_id : null);
    const hasChanges = score1 !== match.player1_score || score2 !== match.player2_score || isWO !== match.is_wo || (match.winner_id !== currentWinnerId && currentWinnerId !== null);

    const handleSave = () => {
        onUpdate(currentWinnerId, isWO, score1, score2);
    };

    const handleQuickWO = (playerNum: 1 | 2) => {
        if (playerNum === 1) {
            setScore1(2);
            setScore2(0);
        } else {
            setScore1(0);
            setScore2(2);
        }
        setIsWO(true);
    };

    const tag1 = match.player1?.clan_members?.[0]?.clans?.tag;
    const tag2 = match.player2?.clan_members?.[0]?.clans?.tag;

    return (
        <Card className={`relative overflow-hidden transition-all duration-500 border-border/40 hover:border-primary/30 ${match.winner_id ? 'bg-primary/5 ring-1 ring-primary/10' : 'bg-card/40'}`}>
            {/* Header Badge */}
            <div className="absolute top-0 left-0 right-0 flex justify-center">
                <Badge variant="secondary" className="rounded-t-none text-[9px] h-5 px-3 bg-black/40 text-muted-foreground font-black tracking-[0.2em] border-x border-b border-white/5">
                    {match.round_name} <span className="text-primary/50 ml-1">#{match.id}</span>
                </Badge>
            </div>

            <CardContent className="pt-8 pb-4 px-4">
                <div className="flex items-center justify-between gap-2">
                    
                    {/* Player 1 Section */}
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                            <FramedAvatar 
                                userId={match.player1_id} 
                                username={match.player1?.username} 
                                avatarUrl={match.player1?.avatar_url} 
                                sizeClassName="h-12 w-12" 
                            />
                            {currentWinnerId === match.player1_id && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg border-2 border-background animate-in zoom-in duration-300">
                                    <Trophy className="h-3 w-3 text-black" />
                                </div>
                            )}
                        </div>
                        <div className="text-center w-full overflow-hidden">
                            <p className={`text-[10px] font-black uppercase truncate tracking-tighter ${currentWinnerId === match.player1_id ? 'text-primary' : 'text-foreground'}`}>
                                {tag1 && <span className="opacity-60 mr-1">[{tag1}]</span>}
                                {match.player1?.username || "Aguardando..."}
                            </p>
                        </div>
                        {match.player1_id && match.player2_id && !match.winner_id && (
                            <Button 
                                size="sm" variant="ghost" 
                                className="h-6 text-[8px] font-black opacity-40 hover:opacity-100"
                                onClick={() => handleQuickWO(1)}
                            >
                                VITÓRIA W.O.
                            </Button>
                        )}
                    </div>

                    {/* Scoreboard Center */}
                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className={`flex items-center gap-1 p-1 rounded-lg border transition-all ${hasChanges ? 'bg-primary/20 border-primary animate-pulse' : 'bg-black/40 border-white/5'}`}>
                            <Input 
                                type="number" 
                                value={score1}
                                onChange={(e) => { setScore1(Number(e.target.value)); setIsWO(false); }}
                                className="w-10 h-10 text-center text-xl font-black bg-transparent border-0 focus-visible:ring-0 p-0"
                                disabled={!match.player1_id || !match.player2_id || isPending}
                            />
                            <div className="w-px h-6 bg-white/10" />
                            <Input 
                                type="number" 
                                value={score2}
                                onChange={(e) => { setScore2(Number(e.target.value)); setIsWO(false); }}
                                className="w-10 h-10 text-center text-xl font-black bg-transparent border-0 focus-visible:ring-0 p-0"
                                disabled={!match.player1_id || !match.player2_id || isPending}
                            />
                        </div>
                        
                        {hasChanges ? (
                            <Button 
                                size="sm" 
                                className="h-7 px-4 bg-green-600 hover:bg-green-500 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-green-900/20"
                                onClick={handleSave}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                            </Button>
                        ) : match.winner_id ? (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive"
                                onClick={() => onUpdate(null, false, 0, 0)}
                                disabled={isPending}
                            >
                                <RotateCcw className="h-2 w-2 mr-1" /> Resetar
                            </Button>
                        ) : null}
                    </div>

                    {/* Player 2 Section */}
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                            <FramedAvatar 
                                userId={match.player2_id} 
                                username={match.player2?.username} 
                                avatarUrl={match.player2?.avatar_url} 
                                sizeClassName="h-12 w-12" 
                            />
                            {currentWinnerId === match.player2_id && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg border-2 border-background animate-in zoom-in duration-300">
                                    <Trophy className="h-3 w-3 text-black" />
                                </div>
                            )}
                        </div>
                        <div className="text-center w-full overflow-hidden">
                            <p className={`text-[10px] font-black uppercase truncate tracking-tighter ${currentWinnerId === match.player2_id ? 'text-primary' : 'text-foreground'}`}>
                                {tag2 && <span className="opacity-60 mr-1">[{tag2}]</span>}
                                {match.player2?.username || (match.player1_id && !match.player2_id ? "BYE" : "Aguardando...")}
                            </p>
                        </div>
                        {match.player1_id && match.player2_id && !match.winner_id && (
                            <Button 
                                size="sm" variant="ghost" 
                                className="h-6 text-[8px] font-black opacity-40 hover:opacity-100"
                                onClick={() => handleQuickWO(2)}
                            >
                                VITÓRIA W.O.
                            </Button>
                        )}
                    </div>

                </div>
                {isWO && (
                    <div className="mt-2 flex justify-center">
                        <Badge variant="outline" className="text-[7px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black tracking-widest uppercase py-0 h-4">Walkover (Ausência)</Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const TournamentManagementPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [numGroups, setNumGroups] = useState(2);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("title, organizer_id, exclusive_organizer_only, tournament_model, is_private, type, format, show_on_home")
        .eq("id", Number(id))
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['profile_role', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
      return data;
    },
    enabled: !!currentUser
  });

  const isSuperAdmin = currentUserProfile?.role === 'super-admin' || currentUser?.id === "80193776-6790-457c-906d-ed45ea16df9f";
  const isOrganizer = currentUser?.id === (tournament as any)?.organizer_id;
  // A general admin has elevated privileges, but not full control like a super-admin.
  const isAdmin = isSuperAdmin || currentUserProfile?.role === 'admin'; 

  useEffect(() => {
    if (tournament && currentUser && currentUserProfile) {
      const t = tournament as any;
      const isOrganizerOfThis = currentUser.id === t.organizer_id;
      const isPrivileged = currentUserProfile.role === 'super-admin' || 
                          currentUserProfile.role === 'admin' || 
                          currentUser.id === "80193776-6790-457c-906d-ed45ea16df9f";

      if (t.exclusive_organizer_only && !isOrganizerOfThis && !isPrivileged) {
        toast({
          title: "Acesso Negado",
          description: "Este torneio é exclusivo do organizador. Você não tem permissão para gerenciá-lo.",
          variant: "destructive",
        });
        navigate("/dashboard/tournaments");
      }
    } else if (tournament && !currentUser && !isLoadingTournament) {
      navigate("/auth");
    }
  }, [tournament, currentUser, currentUserProfile, navigate, isLoadingTournament]);

  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["tournamentParticipantsManagement", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select(`
          id,
          user_id,
          total_wins_in_tournament,
          team_selection,
          group_name,
          checked_in,
          is_disqualified,
          profiles (
            id,
            username,
            discord_username,
            avatar_url,
            banner_url,
            level,
            equipped_frame_url,
            clan_members (
              clans (
                tag
              )
            )
          )
        `)
        .eq("tournament_id", Number(id));

      if (error) throw error;
      return data as Participant[];
    },
    enabled: !!id,
  });

  const { data: matches, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["tournamentMatches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          *,
          player1:player1_id(username, avatar_url, clan_members(clans(tag))),
          player2:player2_id(username, avatar_url, clan_members(clans(tag)))
        `)
        .eq("tournament_id", Number(id))
        .order("round_number", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      return data as any as Match[];
    },
    enabled: !!id,
  });

  const shuffleGroupsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('shuffle_tournament_groups', {
        p_tournament_id: Number(id),
        p_num_groups: numGroups
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sorteio Realizado", description: `Jogadores distribuídos em ${numGroups} grupos.` });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro no sorteio", description: error.message, variant: "destructive" });
    }
  });

  const resetGroupsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_tournament_groups', {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grupos Resetados", description: "Todos os jogadores voltaram para 'Sem grupo'." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao resetar", description: error.message, variant: "destructive" });
    }
  });

  const generateBracketMutation = useMutation({
    queryKey: ["tournamentMatches", id],
    mutationFn: async () => {
      const { error } = await supabase.rpc('generate_single_elimination_bracket', {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chaveamento Gerado", description: "A árvore de mata-mata foi criada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["tournamentMatches", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar chaveamento", description: error.message, variant: "destructive" });
    }
  });

  const [isKnockoutPreviewOpen, setIsKnockoutPreviewOpen] = useState(false);

  const { data: qualifiers, isLoading: isLoadingQualifiers } = useQuery({
    queryKey: ["tournamentQualifiers", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_qualifiers', {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
      
      // Fetch profile info for these users
      const userIds = data.map((q: any) => q.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, clan_members(clans(tag))')
        .in('id', userIds);

      return data.map((q: any) => ({
        ...q,
        profile: profiles?.find(p => p.id === q.user_id)
      }));
    },
    enabled: isKnockoutPreviewOpen,
  });

  const pot1 = qualifiers?.filter((q: any) => q.pos === 1) || [];
  const pot2 = qualifiers?.filter((q: any) => q.pos === 2) || [];

  const generateKnockoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('generate_knockout_from_groups', {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Mata-mata Gerado", description: "Sorteio de potes realizado e chaves criadas!" });
      queryClient.invalidateQueries({ queryKey: ["tournamentMatches", id] });
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro no sorteio", description: error.message, variant: "destructive" });
    }
  });

  const generateSwissRoundMutation = useMutation({
    mutationFn: async () => {
      const pairings = await generateSwissPairings(Number(id));
      
      const { data: existingMatches } = await supabase
        .from("tournament_matches")
        .select("round_number")
        .eq("tournament_id", Number(id));
      
      const nextRound = Math.max(0, ...(existingMatches?.map(m => m.round_number) || [])) + 1;
      
      const matchesToInsert = pairings.map(p => ({
        tournament_id: Number(id),
        player1_id: p.player1,
        player2_id: p.player2,
        round_name: `Rodada ${nextRound}`,
        round_number: nextRound,
        // If it's a BYE, player2 is null, and we can auto-set winner as player1
        winner_id: p.player2 === null ? p.player1 : null,
        player1_score: p.player2 === null ? 2 : 0,
        player2_score: p.player2 === null ? 0 : 0
      }));

      const { error } = await supabase.from("tournament_matches").insert(matchesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rodada Gerada", description: "Novos confrontos criados com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["tournamentMatches", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar rodada", description: error.message, variant: "destructive" });
    }
  });



  const resetBracketMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_tournament_bracket', {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Torneio Resetado", description: "Todas as partidas e resultados foram excluídos." });
      queryClient.invalidateQueries({ queryKey: ["tournamentMatches", id] });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao resetar", description: error.message, variant: "destructive" });
    }
  });

  const updateMatchWinnerMutation = useMutation({
    mutationFn: async ({ matchId, winnerId, isWO = false, score1 = 0, score2 = 0 }: { matchId: number, winnerId: string | null, isWO?: boolean, score1?: number, score2?: number }) => {
      const { error } = await supabase
        .from("tournament_matches")
        .update({ 
          winner_id: winnerId,
          is_wo: isWO,
          player1_score: score1,
          player2_score: score2
        })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Resultado Atualizado", description: "O vencedor e o placar foram registrados." });
      queryClient.invalidateQueries({ queryKey: ["tournamentMatches", id] });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_profiles_for_admin', { p_search_term: searchTerm });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const addParticipantMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log("Tentando adicionar participante:", { tournamentId: Number(id), userId }); // DEBUG

      if (!userId) throw new Error("ID do usuário inválido.");

      const { error } = await supabase.rpc('admin_add_participant', { 
        p_tournament_id: Number(id), 
        p_user_id: userId 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Jogador adicionado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
      // Keep search results open to allow multiple additions
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    }
  });

  const updateParticipantGroupMutation = useMutation({
    mutationFn: async ({ participantId, groupName }: { participantId: number, groupName: string | null }) => {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ group_name: groupName })
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grupo Atualizado", description: "O jogador foi movido com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar grupo", description: error.message, variant: "destructive" });
    }
  });

  const togglePrivateMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const { error } = await supabase.from('tournaments').update({ is_private: isPrivate }).eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Privacidade do torneio atualizada." });
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
  });

  const toggleShowOnHomeMutation = useMutation({
    mutationFn: async (showOnHome: boolean) => {
      const { error } = await supabase.from('tournaments').update({ show_on_home: showOnHome }).eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Visibilidade na Home atualizada." });
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    },
  });

  const { data: allDecks, isLoading: isLoadingDecks } = useQuery({
    queryKey: ["tournamentDecksForAdmin", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tournament_decks_for_admin', { p_tournament_id: Number(id) });
      if (error) throw error;
      return data as ParticipantDeck[];
    },
    enabled: !!id,
  });

  const decksByUserId = new Map<string, ParticipantDeck[]>();
  if (allDecks) {
    for (const deck of allDecks) {
      if (deck.user_id && !decksByUserId.has(deck.user_id)) decksByUserId.set(deck.user_id, []);
      if (deck.user_id) decksByUserId.get(deck.user_id)!.push(deck);
    }
  }

  const updateWinsMutation = useMutation({
    mutationFn: async ({ participantId, change, userId }: { participantId: number; change: number; userId: string }) => {
      const { error } = await supabase.rpc('update_player_wins', { p_participant_id: participantId, p_win_change: change });
      if (error) throw error;
      return { userId };
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso", description: "Contagem de vitórias atualizada." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
      queryClient.invalidateQueries({ queryKey: ["profile", data.userId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Erro: ${error.message}`, variant: "destructive" });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const { error } = await supabase.rpc('admin_remove_participant', { 
        p_participant_id: participantId 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Participante removido e dados associados limpos." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
      queryClient.invalidateQueries({ queryKey: ["tournamentDecksForAdmin", id] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao remover", 
        description: error.message || "Não foi possível remover o participante. Verifique se ele possui partidas ativas.", 
        variant: "destructive" 
      });
    }
  });

  const toggleDisqualifyMutation = useMutation({
    mutationFn: async ({ participantId, disqualified }: { participantId: number, disqualified: boolean }) => {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ is_disqualified: disqualified })
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Atualizado", description: "Status de desclassificação alterado." });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
  });

  const removeUncheckedMutation = useMutation({
    mutationFn: async () => {
        const { data, error } = await supabase.rpc('remove_unchecked_participants', { p_tournament_id: Number(id) });
        if (error) throw error;
        return data;
    },
    onSuccess: (removedCount) => {
        toast({ title: "Limpeza Concluída", description: `${removedCount} participantes ausentes foram removidos.` });
        queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", id] });
    },
  });

  const forceUpdateSnapshotMutation = useMutation({
    mutationFn: async ({ userId, deckId }: { userId: string, deckId: number }) => {
      const { error } = await supabase.rpc('admin_force_update_snapshot', {
        p_tournament_id: Number(id),
        p_user_id: userId,
        p_deck_id: deckId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Snapshot Atualizado", description: "O deck do torneio agora reflete a versão atual do deck do jogador." });
      queryClient.invalidateQueries({ queryKey: ["tournamentDecksForAdmin", id] });
    },
    onError: (error: any) => {
      console.error("Snapshot sync error:", error);
      const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      toast({ title: "Erro ao atualizar", description: errorMessage, variant: "destructive" });
    }
  });

  const handleUpdateWins = (participant: Participant, change: number) => {
    if (!participant.profiles?.id) return;
    updateWinsMutation.mutate({ 
      participantId: participant.id, 
      change, 
      userId: participant.profiles.id 
    });
  };

  const handleRemoveParticipant = (participantId: number) => {
    removeParticipantMutation.mutate(participantId);
  };

  const handleCopyParticipants = () => {
    if (!participants) return;
    const list = [...participants].sort((a, b) => a.id - b.id).map((p) => {
        const clan = Array.isArray(p.profiles?.clan_members) 
          ? p.profiles?.clan_members[0]?.clans 
          : (p.profiles?.clan_members as any)?.clans;
        const tag = clan?.tag ? `[${clan.tag}] ` : "";
        const username = p.profiles?.username || "Unknown";
        const discord = p.profiles?.discord_username || "Sem Discord";
        return `${tag}${username} - ${discord}`;
    }).join("\n");
    navigator.clipboard.writeText(list).then(() => {
      toast({ title: "Lista copiada!", description: "A lista de participantes foi copiada." });
    });
  };

  const isLoading = isLoadingTournament || isLoadingParticipants || isLoadingDecks || isLoadingMatches;

  if (isLoadingTournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg font-bold">Carregando Torneio...</span>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <Link to="/dashboard/tournaments">
        <Button variant="ghost" className="mb-8 hover:text-primary transition-all">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </Link>

      <div className="space-y-6">
        <Card className="bg-gradient-card border-border overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Crown className="h-10 w-10 text-primary animate-pulse" />
                <div>
                  <CardTitle className="text-3xl font-black uppercase tracking-tighter italic">Painel de Gerência</CardTitle>
                  <CardDescription className="font-medium text-primary/80">{tournament?.title || "Carregando..."}</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  {tournament?.format === 'groups' ? 'Fase de Grupos' : tournament?.format === 'swiss' ? 'Suíço' : 'Mata-mata'}
                </Badge>
                <Badge variant="secondary">
                  {tournament?.tournament_model}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 h-14 px-4 gap-4 overflow-x-auto overflow-y-hidden">
                <TabsTrigger value="participants" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                  <LayoutDashboard className="h-4 w-4" /> Inscritos
                </TabsTrigger>
                <TabsTrigger value="matches" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                  <Swords className="h-4 w-4" /> Resultados
                </TabsTrigger>
                {((tournament as any)?.format === 'groups' || (tournament as any)?.format === 'single_elimination' || (tournament as any)?.format === 'swiss') && (
                  <TabsTrigger value="organization" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                    <Shuffle className="h-4 w-4" /> Organização
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                  <Settings className="h-4 w-4" /> Ajustes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="p-6 space-y-6 m-0">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full lg:w-1/3 space-y-4">
                    <div className="p-4 bg-muted/20 border rounded-xl space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Inserção Manual
                      </h3>
                      <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-grow">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Nick ou clã..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={isSearching} size="sm">Buscar</Button>
                      </form>
                      {searchResults.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                          {searchResults
                            .filter(result => !participants?.some(p => p.user_id === result.profile_id))
                            .map((result) => (
                              <div key={result.profile_id} className="flex items-center justify-between p-2 bg-background border rounded-lg hover:border-primary/50 transition-colors">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FramedAvatar username={result.username} avatarUrl={result.avatar_url} sizeClassName="h-8 w-8" />
                                  <div className="flex flex-col truncate">
                                    <span className="font-medium text-sm truncate">{result.username}</span>
                                    {result.clan_tag && <span className="text-[10px] text-primary font-bold">[{result.clan_tag}]</span>}
                                  </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => addParticipantMutation.mutate(result.profile_id)}><PlusCircle className="h-5 w-5" /></Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleCopyParticipants} variant="outline" className="w-full gap-2 justify-start"><Copy className="h-4 w-4" /> Copiar Lista</Button>
                      {(tournament as any)?.tournament_model === 'Diário' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" className="w-full gap-2 justify-start bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"><UserX className="h-4 w-4" /> Remover Ausentes</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle><AlertDialogDescription>Isso removerá quem não fez check-in.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => removeUncheckedMutation.mutate()} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    {isLoadingParticipants ? (
                      <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="w-[50px]">No.</TableHead>
                              <TableHead>Jogador</TableHead>
                              {(tournament as any)?.tournament_model === 'Diário' && <TableHead className="text-center">Check-in</TableHead>}
                              {(tournament as any)?.format === 'groups' && <TableHead>Grupo</TableHead>}
                              <TableHead className="text-center">Vitórias</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {participants?.sort((a, b) => a.id - b.id)?.map((p, index) => {
                              const userDecks = decksByUserId.get(p.user_id);
                              const hasDecks = userDecks && userDecks.length > 0;
                              
                              const exclusiveMode = (tournament as any)?.exclusive_organizer_only;
                              
                              // Admins always see, Organizers always see, 
                              // others only see if NOT in exclusive mode
                              const showDecklistButton = isOrganizer || isSuperAdmin || !exclusiveMode;

                              return (
                                <TableRow key={p.id} className="group hover:bg-muted/5">
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <FramedAvatar userId={p.profiles?.id} avatarUrl={p.profiles?.avatar_url} frameUrl={p.profiles?.equipped_frame_url} username={p.profiles?.username} sizeClassName="h-9 w-9" />
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const clan = Array.isArray(p.profiles?.clan_members) 
                                              ? p.profiles?.clan_members[0]?.clans 
                                              : (p.profiles?.clan_members as any)?.clans;
                                            return (
                                              <Link to={`/profile/${p.profiles?.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                                                <UserDisplay profile={p.profiles || {}} clan={clan} />
                                              </Link>
                                            );
                                          })()}
                                          {p.team_selection && <img src={getTeamLogoUrl(p.team_selection)} className="w-5 h-5" alt="" />}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  {(tournament as any)?.tournament_model === 'Diário' && (
                                    <TableCell className="text-center">{p.checked_in ? <Badge className="bg-green-500/10 text-green-500 border-green-500/20">OK</Badge> : <Badge className="bg-red-500/10 text-red-500 border-red-500/20">AUSENTE</Badge>}</TableCell>
                                  )}
                                  {(tournament as any)?.format === 'groups' && (
                                    <TableCell>
                                      <Select 
                                        value={p.group_name || "none"} 
                                        onValueChange={(val) => updateParticipantGroupMutation.mutate({ 
                                          participantId: p.id, 
                                          groupName: val === "none" ? null : val 
                                        })}
                                      >
                                        <SelectTrigger className="h-8 w-[110px] text-[10px]">
                                          <SelectValue placeholder="Sem grupo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none" className="text-[10px]">Nenhum</SelectItem>
                                          {Array.from({ length: 16 }).map((_, i) => {
                                            const name = `Grupo ${String.fromCharCode(65 + i)}`;
                                            return <SelectItem key={name} value={name} className="text-[10px]">{name}</SelectItem>;
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                  )}
                                  <TableCell className="text-center font-bold text-primary">{p.total_wins_in_tournament}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {hasDecks && userDecks && showDecklistButton && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><FileSearch className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            {userDecks.map(dl => (
                                              <div key={dl.deck_id} className="flex flex-col border-b last:border-0 border-border/10 pb-1 mb-1 last:pb-0 last:mb-0">
                                                <DropdownMenuItem asChild>
                                                  <Link to={`/deck/${dl.deck_id}?snapshot_id=${dl.deck_snapshot_id}`} target="_blank" className="flex-1">
                                                    {dl.deck_name || 'Deck'}
                                                  </Link>
                                                </DropdownMenuItem>
                                                {isSuperAdmin && (
                                                  <DropdownMenuItem 
                                                    className="text-[10px] text-primary font-bold bg-primary/5 hover:bg-primary/10 cursor-pointer"
                                                    onClick={() => forceUpdateSnapshotMutation.mutate({ userId: p.user_id, deckId: dl.deck_id })}
                                                  >
                                                    <RotateCcw className="h-3 w-3 mr-1" /> Sincronizar Snapshot
                                                  </DropdownMenuItem>
                                                )}
                                              </div>
                                            ))}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                      <div className="flex bg-muted/20 rounded-lg p-0.5">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => handleUpdateWins(p, 1)}><PlusCircle className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleUpdateWins(p, -1)} disabled={p.total_wins_in_tournament === 0}><MinusCircle className="h-4 w-4" /></Button>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={`h-8 w-8 ${p.is_disqualified ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                                        title={p.is_disqualified ? "Remover Desclassificação" : "Marcar W.O. (Desclassificar)"}
                                        onClick={() => toggleDisqualifyMutation.mutate({ participantId: p.id, disqualified: !p.is_disqualified })}
                                      >
                                        <ShieldAlert className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"><UserX className="h-4 w-4" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>Remover?</AlertDialogTitle></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveParticipant(p.id)} className="bg-destructive">Sim</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="matches" className="p-6 m-0">
                <div className="max-w-4xl mx-auto py-4">
                  <MatchReporter tournamentId={id!} />
                </div>
              </TabsContent>

              <TabsContent value="organization" className="p-6 m-0 space-y-6">
                {(tournament as any)?.format === 'groups' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Shuffle className="h-5 w-5 text-primary" /> Gerador de Grupos</CardTitle>
                      <CardDescription>Distribua os jogadores em grupos aleatórios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-6">
                        <div className="space-y-2">
                          <Label>Quantidade de Grupos</Label>
                          <Input type="number" value={numGroups} onChange={(e) => setNumGroups(Number(e.target.value))} className="w-24 h-12 text-xl font-bold text-center" />
                        </div>
                        <Button className="h-12 gap-2 flex-1" onClick={() => shuffleGroupsMutation.mutate()} disabled={shuffleGroupsMutation.isPending}><Shuffle className="h-5 w-5" /> Sortear Agora</Button>
                        {participants?.some(p => p.group_name) && <Button variant="outline" className="h-12 border-dashed" onClick={() => resetGroupsMutation.mutate()} disabled={resetGroupsMutation.isPending}>Limpar</Button>}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(tournament as any)?.format === 'groups' && (
                  <Card className="bg-yellow-500/5 border-yellow-500/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> Transição para Mata-mata</CardTitle>
                      <CardDescription>Sorteia os 1º e 2º lugares de cada grupo para criar a fase eliminatória.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                        <p className="font-bold text-yellow-600 flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4" /> Regras do Sorteio:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                          <li><strong>Pote 1:</strong> Todos os que ficaram em 1º lugar.</li>
                          <li><strong>Pote 2:</strong> Todos os que ficaram em 2º lugar.</li>
                          <li>O sistema garante que jogadores do <strong>mesmo grupo</strong> não se enfrentem agora.</li>
                          <li>Libera automaticamente a <strong>troca de deck</strong> para os classificados.</li>
                        </ul>
                      </div>

                      <Button 
                        className="w-full h-14 gap-2 text-lg bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-900/20" 
                        disabled={generateKnockoutMutation.isPending || !participants || participants.length < 4}
                        onClick={() => setIsKnockoutPreviewOpen(true)}
                      >
                        <Shuffle className="h-6 w-6" /> Revisar Potes e Gerar Mata-mata
                      </Button>

                      <Dialog open={isKnockoutPreviewOpen} onOpenChange={setIsKnockoutPreviewOpen}>
                        <DialogContent className="max-w-2xl bg-slate-950 border-yellow-500/20">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase italic text-yellow-500 flex items-center gap-2">
                              <Trophy className="h-6 w-6" /> Revisão de Classificados
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                              Verifique se os classificados de cada grupo estão corretos antes de realizar o sorteio das chaves.
                            </DialogDescription>
                          </DialogHeader>

                          {isLoadingQualifiers ? (
                            <div className="flex flex-col items-center py-12 gap-4">
                              <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                              <p className="text-sm font-bold animate-pulse">Calculando classificações...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-6 py-6">
                              {/* Pot 1 */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2">
                                  <h4 className="font-black uppercase text-xs tracking-widest text-yellow-500">Pote 1 (Líderes)</h4>
                                  <Badge className="bg-yellow-500 text-black font-black text-[10px]">{pot1.length}</Badge>
                                </div>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                  {pot1.map((q: any) => (
                                    <div key={q.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                      <FramedAvatar username={q.profile?.username} avatarUrl={q.profile?.avatar_url} sizeClassName="h-8 w-8" />
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-bold truncate">
                                          {q.profile?.clan_members?.[0]?.clans?.tag && <span className="text-primary mr-1">[{q.profile.clan_members[0].clans.tag}]</span>}
                                          {q.profile?.username || "---"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-black">{q.group_name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Pot 2 */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                  <h4 className="font-black uppercase text-xs tracking-widest text-slate-400">Pote 2 (Vices)</h4>
                                  <Badge variant="outline" className="text-slate-400 border-white/10 font-black text-[10px]">{pot2.length}</Badge>
                                </div>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                  {pot2.map((q: any) => (
                                    <div key={q.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                      <FramedAvatar username={q.profile?.username} avatarUrl={q.profile?.avatar_url} sizeClassName="h-8 w-8" />
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-bold truncate">
                                          {q.profile?.clan_members?.[0]?.clans?.tag && <span className="text-primary mr-1">[{q.profile.clan_members[0].clans.tag}]</span>}
                                          {q.profile?.username || "---"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-black">{q.group_name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-6 mt-2">
                            <Button variant="ghost" onClick={() => setIsKnockoutPreviewOpen(false)} disabled={generateKnockoutMutation.isPending}>
                              Cancelar
                            </Button>
                            <Button 
                              className="bg-yellow-600 hover:bg-yellow-500 text-white font-black uppercase tracking-tighter"
                              onClick={() => {
                                generateKnockoutMutation.mutate();
                                setIsKnockoutPreviewOpen(false);
                              }}
                              disabled={generateKnockoutMutation.isPending || !qualifiers || qualifiers.length === 0}
                            >
                              {generateKnockoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shuffle className="h-4 w-4 mr-2" />}
                              Confirmar e Sortear Chaves
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}

                {(tournament as any)?.format === 'single_elimination' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Chaveamento Mata-mata</CardTitle>
                      <CardDescription>Gere a árvore de eliminatória simples baseada nos inscritos atuais.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-sm space-y-2">
                        <p className="font-bold flex items-center gap-2 text-primary"><ShieldAlert className="h-4 w-4" /> Informações Importantes:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                          <li>O sistema criará chaves automáticas (2, 4, 8, 16 ou 32 vagas).</li>
                          <li>Jogadores sem oponente inicial avançarão automaticamente para a 2ª rodada.</li>
                          <li>Isso irá <strong>RESETAR</strong> todas as partidas existentes deste torneio.</li>
                        </ul>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="h-14 gap-2 flex-1 text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={generateBracketMutation.isPending || !participants || participants.length < 2}>
                              <Trophy className="h-6 w-6" /> Gerar Árvore de Torneio
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Criar Novo Chaveamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá apagar todos os resultados atuais e criar uma nova árvore de partidas. Tem certeza?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => generateBracketMutation.mutate()} className="bg-primary">Sim, Gerar Chave</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {matches && matches.length > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" className="h-14 gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-white" disabled={resetBracketMutation.isPending}>
                                <UserX className="h-6 w-6" /> Excluir Chaveamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Chaveamento Completo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá permanentemente todas as partidas e resultados da árvore. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resetBracketMutation.mutate()} className="bg-destructive">Sim, Excluir Tudo</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(tournament as any)?.format === 'swiss' && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Sistema Suíço</CardTitle>
                      <CardDescription>Gerencie as rodadas com base na pontuação e Buchholz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-sm space-y-2">
                        <p className="font-bold flex items-center gap-2 text-primary"><ShieldAlert className="h-4 w-4" /> Como funciona:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                          <li>O sistema emparealha jogadores com pontuações similares.</li>
                          <li>Evita repetição de oponentes (sempre que possível).</li>
                          <li>BYEs são atribuídos automaticamente se o número de jogadores for ímpar.</li>
                          <li>Certifique-se de que <strong>TODOS</strong> os resultados da rodada anterior foram registrados antes de gerar a próxima.</li>
                        </ul>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="h-14 gap-2 flex-1 text-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" disabled={generateSwissRoundMutation.isPending || !participants || participants.length < 2}>
                              <Shuffle className="h-6 w-6" /> Gerar Próxima Rodada
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Gerar Nova Rodada?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso criará novos confrontos com base na classificação atual. Verifique se todos os resultados anteriores estão corretos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => generateSwissRoundMutation.mutate()} className="bg-primary">Sim, Gerar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {matches && matches.length > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" className="h-14 gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-white" disabled={resetBracketMutation.isPending}>
                                <RotateCcw className="h-6 w-6" /> Resetar Suíço
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Todas as Rodadas?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá permanentemente todas as partidas e classificações do suíço. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resetBracketMutation.mutate()} className="bg-destructive">Sim, Excluir Tudo</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settings" className="p-6 m-0 space-y-6">
                <div className="p-4 bg-background border rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Torneio Privado</Label>
                    <p className="text-xs text-muted-foreground">Bloqueia inscrições públicas diretas.</p>
                  </div>
                  <Switch checked={tournament?.is_private} onCheckedChange={(val) => togglePrivateMutation.mutate(val)} disabled={togglePrivateMutation.isPending} />
                </div>

                <div className="p-4 bg-background border rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Exibir na Página Inicial</Label>
                    <p className="text-xs text-muted-foreground">Define se o torneio aparece no carrossel da Home.</p>
                  </div>
                  <Switch checked={tournament?.show_on_home} onCheckedChange={(val) => toggleShowOnHomeMutation.mutate(val)} disabled={toggleShowOnHomeMutation.isPending} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default TournamentManagementPage;