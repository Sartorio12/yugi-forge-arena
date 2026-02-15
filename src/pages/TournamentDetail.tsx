import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Calendar, ExternalLink, Loader2, ArrowLeft, CheckCircle, Layers, Ban, BrainCircuit, LayoutDashboard, Users2, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { ManageDecklist } from "@/components/ManageDecklist";
import { ManageMultipleDecklists } from "@/components/ManageMultipleDecklists";
import { FramedAvatar } from "@/components/FramedAvatar";
import { BanlistSelector } from "@/components/BanlistSelector";
import { CustomBanlist } from "@/components/CustomBanlist";
import { FOOTBALL_TEAMS, getTeamLogoUrl } from "@/constants/teams";
import { useTranslation } from "react-i18next";
import { TournamentPredictions } from "@/components/tournament/TournamentPredictions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Participant {
  user_id: string;
  team_selection?: string;
  group_name?: string;
  checked_in: boolean;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame_url: string | null;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    } | null;
  } | null;
}

interface TournamentDetailProps {
  user: User | null;
  onLogout: () => void;
}

const TournamentDetail = ({ user, onLogout }: TournamentDetailProps) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [banishmentSelectedCards, setBanishmentSelectedCards] = useState<string[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*, profiles:organizer_id(id, username, avatar_url, equipped_frame_url, clan_members(clans(tag)))") 
        .eq("id", Number(id))
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      console.log("Tournament Data:", data); // Debug log
      return data;
    },
  });

  const { data: userDecks, isLoading: isLoadingUserDecks } = useQuery({
    queryKey: ["userDecks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name, is_genesys")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["tournamentParticipants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select(`
            user_id, 
            team_selection, 
            group_name, 
            checked_in,
            profiles (
                username,
                avatar_url,
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
      return data as any as Participant[];
    },
    enabled: !!id,
  });

  const userParticipation = participants?.find((p) => p.user_id === user?.id);
  const isRegistered = !!userParticipation;
  const isQualifier = (tournament as any)?.allow_deck_updates && userParticipation && 
                      participants?.filter(p => p.group_name).some(p => p.user_id === user?.id); 
                      // Simple check for now, backend RPC will strictly verify.

  // Group participants by group_name
  const participantsByGroup = participants?.reduce((acc: Record<string, Participant[]>, p) => {
    if (p.group_name) {
      if (!acc[p.group_name]) acc[p.group_name] = [];
      acc[p.group_name].push(p);
    }
    return acc;
  }, {});

  const isGroupFormat = (tournament as any)?.format === 'groups' || (tournament as any)?.type === 'grupos';
  const isBracketFormat = (tournament as any)?.format === 'single_elimination';
  const isSwissFormat = (tournament as any)?.format === 'swiss';
  const hasGroupsPopulated = participantsByGroup && Object.keys(participantsByGroup).length > 0;

  const { data: existingBans } = useQuery({
    queryKey: ["existingBans", id],
    queryFn: async () => {
        if (!id) return [];
        const { data, error } = await supabase
            .from("tournament_banned_cards")
            .select("card_id")
            .eq("tournament_id", Number(id));
        if (error) throw error;
        return data.map(b => b.card_id);
    },
    enabled: !!id && (tournament as any)?.type === 'banimento',
  });

  const registrationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado.");
      if (!id) throw new Error("ID do torneio não encontrado.");
      
      const tournamentType = (tournament as any)?.type || 'standard';
      
      if (tournamentType === 'liga' && !selectedTeam) {
        throw new Error(t('tournament_detail.toast.team_required'));
      }

      if (tournamentType === 'banimento') {
        const requiredBans = (tournament as any).banishment_count || 0;
        if (banishmentSelectedCards.length !== requiredBans) {
          throw new Error(`Você deve selecionar exatamente ${requiredBans} cartas para banir.`);
        }
        
        // No modo banimento, o deck é obrigatório no ato da inscrição por causa do fluxo unificado
        if (tournament.is_decklist_required && !selectedDeckId) {
             throw new Error("Você deve selecionar um deck para se inscrever neste modo.");
        }
      }

      // Para outros modos (Liga/Padrão), não bloqueamos a inscrição sem deck, 
      // pois o usuário pode enviar depois na aba de gestão.

      const { error } = await supabase.rpc('register_to_tournament', {
          p_tournament_id: Number(id),
          p_user_id: user.id,
          p_team_selection: selectedTeam || null,
          p_card_ids: banishmentSelectedCards
      });
      
      if (error) throw error;
      
      // Submit the selected deck if required
      if (tournament.is_decklist_required && selectedDeckId) {
          const { error: deckError } = await supabase.rpc('submit_deck_to_tournament', {
              p_tournament_id: Number(id),
              p_deck_id: parseInt(selectedDeckId, 10),
          });

          if (deckError) {
               throw new Error(`Inscrição realizada, mas erro ao enviar deck: ${deckError.message}`);
          }
      }
    },
    onSuccess: () => {
      toast({
        title: t('tournament_detail.toast.enroll_success'),
        description: t('tournament_detail.toast.enroll_desc'),
      });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipants", id] });
    },
    onError: (error: Error) => {
      toast({
        title: t('tournament_detail.toast.enroll_error'),
        description: error.message || "Não foi possível se inscrever. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      const { error } = await supabase.rpc('perform_check_in', {
        p_tournament_id: Number(id),
        p_user_id: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('tournament_detail.toast.checkin_success'),
        description: t('tournament_detail.toast.checkin_desc'),
      });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipants", id] });
    },
    onError: (error: Error) => {
      toast({
        title: t('tournament_detail.toast.checkin_error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    if (!user) {
      toast({
        title: t('tournament_detail.toast.login_required'),
        description: t('tournament_detail.toast.login_required_desc'),
        variant: "destructive",
      });
      return;
    }
    const tournamentType = (tournament as any)?.type || 'standard';
    if (tournamentType === 'liga' && !selectedTeam) {
      toast({
        title: t('tournament_detail.toast.team_required'),
        description: t('tournament_detail.toast.team_required_desc'),
        variant: "destructive",
      });
      return;
    }
    registrationMutation.mutate();
  };

  const isLoading = isLoadingTournament || isLoadingParticipants;
  
  const tournamentType = (tournament as any)?.type || 'standard';
  const tournamentModel = (tournament as any)?.tournament_model || 'Diário';
  const takenTeams = new Set(participants?.map(p => p.team_selection).filter(Boolean));
  const availableTeams = FOOTBALL_TEAMS.filter(team => !takenTeams.has(team));
  
  const now = new Date();
  const eventDate = tournament?.event_date ? new Date(tournament.event_date) : null;
  const isCheckInOpen = eventDate && 
    tournamentModel === 'Diário' &&
    tournament?.status === 'Aberto' &&
    now >= new Date(eventDate.getTime() - 30 * 60000); 

  const isUserCheckedIn = userParticipation?.checked_in;
  
  const isFull = tournament?.max_participants && participants && participants.length >= tournament.max_participants;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        <Link to="/tournaments">
          <Button variant="ghost" className="mb-8 hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('tournament_detail.back_to_list')}
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tournament ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {tournament.banner_image_url && (
              <div className="relative h-96 rounded-lg overflow-hidden">
                <img
                  src={tournament.banner_image_url}
                  alt={tournament.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <Card className="p-8 bg-gradient-card border-border">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-6 gap-4 text-center md:text-left">
                <div className="flex flex-col items-center md:items-start gap-4 w-full">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                    {tournament.title}
                  </h1>
                  
                  {tournament.profiles && (
                    <Link to={`/profile/${tournament.profiles.id}`} className="hover:text-primary transition-colors">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FramedAvatar 
                          username={tournament.profiles.username}
                          avatarUrl={tournament.profiles.avatar_url}
                          frameUrl={tournament.profiles.equipped_frame_url}
                          sizeClassName="h-5 w-5"
                        />
                        <div className="flex items-center gap-1">
                          {tournament.profiles.clan_members?.clans?.tag && (
                            <span className="text-primary font-bold">[{tournament.profiles.clan_members.clans.tag}]</span>
                          )}
                          <span className="font-medium">{tournament.profiles.username}</span>
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="flex flex-col items-center md:items-start gap-2 text-muted-foreground mt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span>
                        {tournament.event_date ? format(new Date(tournament.event_date), t('tournament_hero.date_format'), {
                          locale: ptBR,
                        }) : t('tournament_detail.not_defined')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <span>
                        {t('tournament_detail.decks_per_player', { count: tournament.num_decks_allowed, plural: tournament.num_decks_allowed > 1 ? 's' : '' })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${tournament.status === "Aberto" ? "bg-primary/90 text-primary-foreground" : "bg-muted/90 text-muted-foreground"}`}>
                  {tournament.status}
                </span>
              </div>

              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-foreground whitespace-pre-wrap">{tournament.description}</p>
              </div>

              {/* Action Buttons Section */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Check-in Logic */}
                {user && isRegistered && tournamentModel === 'Diário' && (
                    <div className="w-full sm:w-auto">
                        {isUserCheckedIn ? (
                             <Button disabled className="w-full bg-green-600/20 text-green-600 border-green-600/50 text-lg py-6">
                                <CheckCircle className="mr-2 h-5 w-5" />
                                {t('tournament_detail.checkin_confirmed')}
                             </Button>
                        ) : (
                            <Button 
                                onClick={() => checkInMutation.mutate()}
                                disabled={!isCheckInOpen || checkInMutation.isPending}
                                className={`w-full text-lg py-6 ${isCheckInOpen ? "animate-pulse bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                variant={isCheckInOpen ? "default" : "secondary"}
                            >
                                {checkInMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                {isCheckInOpen ? t('tournament_detail.checkin_now') : t('tournament_detail.waiting_checkin')}
                            </Button>
                        )}
                        {!isUserCheckedIn && !isCheckInOpen && tournament.status === 'Aberto' && (
                             <p className="text-xs text-center mt-2 text-muted-foreground">
                                 {t('tournament_detail.checkin_info', { time: tournament.event_date ? format(new Date(new Date(tournament.event_date).getTime() - 30 * 60000), "HH:mm") : "??" })}
                             </p>
                        )}
                    </div>
                )}

                {tournament.registration_link && (
                    <a href={tournament.registration_link} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full text-lg py-6">
                            {t('tournament_detail.discord_link')} <ExternalLink className="ml-2 h-5 w-5" />
                        </Button>
                    </a>
                )}
              </div>
            </Card>

            {/* NEW TABS SECTION */}
            <Tabs defaultValue="management" className="w-full">
                <TabsList className="bg-muted/20 p-1 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="management" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" /> {isRegistered ? "Gestão da Inscrição" : "Inscrição"}
                    </TabsTrigger>
                    {isGroupFormat && (
                        <TabsTrigger value="groups" className="gap-2">
                            <Users2 className="h-4 w-4" /> Grupos
                        </TabsTrigger>
                    )}
                    {isBracketFormat && (
                        <TabsTrigger value="bracket" className="gap-2">
                            <Trophy className="h-4 w-4" /> Chaveamento
                        </TabsTrigger>
                    )}
                    {isSwissFormat && (
                        <TabsTrigger value="swiss" className="gap-2">
                            <Layers className="h-4 w-4" /> Classificação Suíça
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="analysis" className="gap-2">
                        <BrainCircuit className="h-4 w-4" /> Análise (Oráculo)
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Groups */}
                {isGroupFormat && (
                    <TabsContent value="groups" className="mt-6">
                        <div className="flex justify-end mb-4">
                            <Link to={`/tournaments/${id}/groups`}>
                                <Button className="gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg">
                                    <Trophy className="h-4 w-4" />
                                    Ver Tabela de Classificação
                                </Button>
                            </Link>
                        </div>
                        
                        {hasGroupsPopulated ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.keys(participantsByGroup!).sort().map((groupName) => (
                                    <Card key={groupName} className="bg-muted/10 border-primary/20 overflow-hidden">
                                        <div className="bg-primary/20 px-4 py-2 border-b border-primary/20 flex justify-between items-center">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Users2 className="h-5 w-5 text-primary" />
                                                {groupName}
                                            </h3>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {participantsByGroup![groupName].map((p) => (
                                                <div key={p.user_id} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <FramedAvatar 
                                                            username={p.profiles?.username || ""}
                                                            avatarUrl={p.profiles?.avatar_url || null}
                                                            frameUrl={p.profiles?.equipped_frame_url || null}
                                                            sizeClassName="h-8 w-8"
                                                        />
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1">
                                                                {p.profiles?.clan_members?.clans?.tag && (
                                                                    <span className="text-primary font-bold text-xs">[{p.profiles.clan_members.clans.tag}]</span>
                                                                )}
                                                                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                                                                    {p.profiles?.username}
                                                                </span>
                                                            </div>
                                                            {p.team_selection && (
                                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <img src={getTeamLogoUrl(p.team_selection)} className="h-3 w-3 object-contain" alt="" />
                                                                    {p.team_selection}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {p.checked_in && (
                                                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-5">
                                                            Check-in
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
                                <p className="text-muted-foreground">Os grupos ainda não foram sorteados para este torneio.</p>
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* Tab: Management / Registration */}
                <TabsContent value="management" className="mt-6 space-y-6">
                    {!user && (
                        <Card className="p-8 text-center bg-muted/10 border-dashed">
                            <p className="text-muted-foreground mb-6">{t('tournament_detail.login_to_enroll')}</p>
                            <Button onClick={() => navigate("/auth")} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6 px-12">
                                {t('navbar.login')}
                            </Button>
                        </Card>
                    )}

                    {user && !isRegistered && (
                        <div className="w-full space-y-6">
                            {(tournament as any)?.is_private && (
                                <div className="w-full p-6 border border-dashed rounded-lg bg-muted/20 flex flex-col items-center gap-2 text-center">
                                    <Ban className="h-8 w-8 text-muted-foreground" />
                                    <div>
                                        <p className="font-bold text-lg">Torneio Exclusivo</p>
                                        <p className="text-muted-foreground text-sm">Este torneio é exclusivo para convidados. Caso você tenha sido selecionado, o organizador irá te inserir manualmente.</p>
                                    </div>
                                </div>
                            )}

                            {!(tournament as any)?.is_private && tournament.status === 'Aberto' && (
                                <div className="w-full space-y-6">
                                    {isFull ? (
                                        <Button variant="outline" disabled className="w-full text-lg py-6 border-destructive/50 text-destructive bg-destructive/5">
                                            <Ban className="mr-2 h-5 w-5" />
                                            Vagas Encerradas
                                        </Button>
                                    ) : (
                                        <>
                                            {/* Liga Team Selection (Pre-registration) */}
                                            {tournamentType === 'liga' && (
                                                <div className="p-6 border rounded-lg bg-muted/20 space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <img src="/genesys_1.png" className="h-6 w-6 object-contain" alt="League" />
                                                        <h3 className="text-xl font-bold">{t('tournament_detail.team_selection_title')}</h3>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">{t('tournament_detail.choose_team_label')}</label>
                                                        <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={registrationMutation.isPending}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t('tournament_detail.select_team_placeholder')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableTeams.map(team => (
                                                                    <SelectItem key={team} value={team}>
                                                                        <div className="flex items-center gap-2">
                                                                            <img src={getTeamLogoUrl(team)} alt={team} className="w-6 h-6 object-contain" />
                                                                            <span>{team}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground italic">
                                                            {t('tournament_detail.team_selection_note')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Banimento Selection (Pre-registration) */}
                                            {tournamentType === 'banimento' && (
                                                <div className="p-6 border rounded-lg bg-muted/20 space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <Ban className="h-6 w-6 text-destructive" />
                                                        <h3 className="text-xl font-bold">{t('tournament_detail.banishment_title')}</h3>
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        <span dangerouslySetInnerHTML={{ __html: t('tournament_detail.banishment_desc', { count: (tournament as any).banishment_count }) }} />
                                                    </p>
                                                    
                                                    <Accordion type="single" collapsible className="w-full border rounded-lg bg-card px-4">
                                                        <AccordionItem value="current-bans" className="border-b-0">
                                                            <AccordionTrigger className="hover:no-underline">
                                                                <span className="font-semibold text-destructive">{t('tournament_detail.view_banned_cards', { count: existingBans?.length || 0 })}</span>
                                                            </AccordionTrigger>
                                                            <AccordionContent>
                                                                <CustomBanlist tournamentId={tournament.id} />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>

                                                    <BanlistSelector 
                                                        maxSelection={(tournament as any).banishment_count || 0}
                                                        selectedCards={banishmentSelectedCards}
                                                        onSelectionChange={setBanishmentSelectedCards}
                                                        unavailableCards={existingBans || []}
                                                    />

                                                    {tournament.is_decklist_required && (
                                                        <div className="pt-4 border-t border-border">
                                                            <h3 className="text-lg font-bold mb-2">{t('tournament_detail.select_deck_title')}</h3>
                                                            <Select
                                                                value={selectedDeckId}
                                                                onValueChange={setSelectedDeckId}
                                                                disabled={registrationMutation.isPending}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder={t('tournament_detail.select_deck_placeholder')} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {userDecks && userDecks.length > 0 ? (
                                                                        userDecks.map((deck: any) => (
                                                                            <SelectItem key={deck.id} value={deck.id.toString()}>
                                                                                {deck.deck_name}
                                                                            </SelectItem>
                                                                        ))
                                                                    ) : (
                                                                        <div className="p-4 text-sm text-muted-foreground">
                                                                            {t('tournament_detail.no_saved_decks')}
                                                                        </div>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                {t('tournament_detail.deck_auto_submit_note')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Genesys Selection (Pre-registration) */}
                                            {tournamentType === 'genesys' && tournament.is_decklist_required && (
                                                <div className="p-6 border rounded-lg bg-muted/20 space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <img src="/genesys_1.png" className="h-6 w-6 object-contain" alt="Genesys" />
                                                        <h3 className="text-xl font-bold">Seleção de Deck Genesys</h3>
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        Este é um torneio Genesys. Apenas decks salvos no <strong>Modo Genesys</strong> no Deck Builder aparecerão na lista abaixo.
                                                    </p>
                                                    <div className="pt-4 border-t border-border">
                                                        <h3 className="text-lg font-bold mb-2">{t('tournament_detail.select_deck_title')}</h3>
                                                        <Select
                                                            value={selectedDeckId}
                                                            onValueChange={setSelectedDeckId}
                                                            disabled={registrationMutation.isPending}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t('tournament_detail.select_deck_placeholder')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {userDecks && userDecks.filter((d: any) => d.is_genesys).length > 0 ? (
                                                                    userDecks
                                                                        .filter((deck: any) => deck.is_genesys)
                                                                        .map((deck: any) => (
                                                                        <SelectItem key={deck.id} value={deck.id.toString()}>
                                                                            {deck.deck_name}
                                                                        </SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-4 text-sm text-muted-foreground">
                                                                        {userDecks && userDecks.length > 0 
                                                                            ? "Nenhum deck Genesys encontrado. Ative o 'Modo Genesys' no Deck Builder ao salvar seu deck."
                                                                            : t('tournament_detail.no_saved_decks')
                                                                        }
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {t('tournament_detail.deck_auto_submit_note')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <Button onClick={handleRegister} disabled={registrationMutation.isPending} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6">
                                                {registrationMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                                {t('tournament_detail.enroll_btn')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {!(tournament as any)?.is_private && tournament.status !== 'Aberto' && (
                                <Button variant="outline" disabled className="w-full text-lg py-6">
                                    {t('tournament_detail.enrollments_closed')}
                                </Button>
                            )}
                        </div>
                    )}

                    {user && isRegistered && (
                        <div className="space-y-6">
                            {/* Qualification Alert for Deck Updates */}
                            {(tournament as any)?.allow_deck_updates && (
                                <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl flex items-center gap-4 animate-pulse">
                                    <Trophy className="h-10 w-10 text-yellow-500 shrink-0" />
                                    <div>
                                        <p className="font-black text-yellow-600 uppercase tracking-tighter">Você se classificou!</p>
                                        <p className="text-sm text-yellow-700/80 font-medium">A 2ª fase começou. Você tem permissão para atualizar seu deck para o mata-mata.</p>
                                    </div>
                                </div>
                            )}

                            {/* Decklist Management */}
                            {tournament.is_decklist_required && (
                                <>
                                {tournament.num_decks_allowed > 1 ? (
                                    <ManageMultipleDecklists
                                    user={user}
                                    tournamentId={tournament.id}
                                    tournamentStatus={tournament.status}
                                    tournamentEventDate={tournament.event_date}
                                    numDecksAllowed={tournament.num_decks_allowed}
                                    tournamentType={tournamentType}
                                    allowDeckUpdates={(tournament as any)?.allow_deck_updates}
                                    />
                                ) : (
                                    <ManageDecklist 
                                    user={user} 
                                    tournamentId={tournament.id}
                                    tournamentStatus={tournament.status}
                                    tournamentEventDate={tournament.event_date}
                                    tournamentType={tournamentType}
                                    allowDeckUpdates={(tournament as any)?.allow_deck_updates}
                                    />
                                )}
                                </>
                            )}

                            {/* Team Selection Info */}
                            {tournamentType === 'liga' && (
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold mb-4">{t('tournament_detail.team_selection_title')}</h3>
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                                        <img 
                                        src={getTeamLogoUrl(userParticipation?.team_selection as string)} 
                                        alt="Team Logo" 
                                        className="w-16 h-16 object-contain"
                                        />
                                        <div>
                                        <p className="font-semibold text-lg">{t('tournament_detail.you_are_defending')}</p>
                                        <p className="text-primary text-xl font-bold">{userParticipation?.team_selection}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Banlist UI */}
                            {tournamentType === 'banimento' && (
                                <div className="mb-8 p-4 border rounded-lg bg-muted/10">
                                    <CustomBanlist tournamentId={tournament.id} />
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>
                
                {/* Tab: Bracket */}
                {isBracketFormat && (
                    <TabsContent value="bracket" className="mt-6">
                        <div className="flex flex-col items-center justify-center p-8 bg-muted/10 border-2 border-dashed rounded-xl gap-4">
                            <Trophy className="h-12 w-12 text-yellow-500/50" />
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold">Árvore do Torneio</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Visualize o chaveamento completo, acompanhe o progresso das rodadas e veja quem avança para a final.
                                </p>
                            </div>
                            <Link to={`/tournaments/${id}/bracket`}>
                                <Button className="gap-2 text-lg h-12 px-8 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg">
                                    <Trophy className="h-5 w-5" />
                                    Ver Chaveamento Completo
                                </Button>
                            </Link>
                        </div>
                    </TabsContent>
                )}

                {/* Tab: Swiss */}
                {isSwissFormat && (
                    <TabsContent value="swiss" className="mt-6">
                        <div className="flex flex-col items-center justify-center p-8 bg-muted/10 border-2 border-dashed rounded-xl gap-4">
                            <Layers className="h-12 w-12 text-primary/50" />
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold">Classificação Suíça</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Acompanhe a pontuação, critérios de desempate (Buchholz) e o progresso das rodadas.
                                </p>
                            </div>
                            <Link to={`/tournaments/${id}/swiss`}>
                                <Button className="gap-2 text-lg h-12 px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg">
                                    <Trophy className="h-5 w-5" />
                                    Ver Tabela Completa
                                </Button>
                            </Link>
                        </div>
                    </TabsContent>
                )}

                {/* Tab: Analysis (Oracle) */}
                <TabsContent value="analysis" className="mt-6">
                    <TournamentPredictions tournamentId={Number(id)} />
                </TabsContent>
            </Tabs>

          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{t('tournaments_page.no_tournaments')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentDetail;