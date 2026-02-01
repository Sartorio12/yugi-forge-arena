import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Calendar, ExternalLink, Loader2, ArrowLeft, CheckCircle, Layers, Ban } from "lucide-react";
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

interface TournamentDetailProps {
  user: User | null;
  onLogout: () => void;
}

const TournamentDetail = ({ user, onLogout }: TournamentDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRegistered, setIsRegistered] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [banishmentSelectedCards, setBanishmentSelectedCards] = useState<string[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        // Fetch profile of the host using organizer_id, including clan info
        .select("*, profiles:organizer_id(id, username, avatar_url, equipped_frame_url, clan_members(clans(tag)))") 
        .eq("id", Number(id))
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: userDecks, isLoading: isLoadingUserDecks } = useQuery({
    queryKey: ["userDecks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name")
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
        .select("user_id, team_selection, checked_in")
        .eq("tournament_id", Number(id));
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  useEffect(() => {
    if (user && participants) {
      const userParticipation = participants.find((p) => p.user_id === user.id);
      setIsRegistered(!!userParticipation);
    } else {
      setIsRegistered(false);
    }
  }, [user, participants]);

  const registrationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado.");
      if (!id) throw new Error("ID do torneio não encontrado.");
      
      const tournamentType = (tournament as any)?.type || 'standard';
      
      if (tournamentType === 'liga' && !selectedTeam) {
        throw new Error("Você deve escolher um time para participar da Liga.");
      }

      if (tournamentType === 'banimento') {
        const requiredBans = (tournament as any).banishment_count || 0;
        if (banishmentSelectedCards.length !== requiredBans) {
          throw new Error(`Você deve selecionar exatamente ${requiredBans} cartas para banir.`);
        }
        
        if (tournament.is_decklist_required && !selectedDeckId) {
             throw new Error("Você deve selecionar um deck para se inscrever.");
        }

        const { error } = await supabase.rpc('register_with_bans', {
            p_tournament_id: Number(id),
            p_user_id: user.id,
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
                 // In a real production app, we might want to rollback the registration here, 
                 // but for now we will just show the error. The user is registered but deck submission failed.
                 // They can try submitting the deck again through the normal ManageDecklist UI.
                 throw new Error(`Inscrição realizada, mas erro ao enviar deck: ${deckError.message}`);
            }
        }

      } else {
        // Standard/Liga Registration
        const { error } = await supabase.from("tournament_participants").insert({
            user_id: user.id,
            tournament_id: Number(id),
            team_selection: tournamentType === 'liga' ? selectedTeam : null
        });

        if (error) {
            if (error.code === '23505') {
            throw new Error("Você já está inscrito neste torneio.");
            }
            throw error;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Inscrição realizada com sucesso!",
        description: "Você agora está inscrito no torneio.",
      });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipants", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na inscrição",
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
        title: "Check-in Realizado!",
        description: "Sua presença foi confirmada.",
      });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipants", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Check-in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    if (!user) {
      toast({
        title: "Ação necessária",
        description: "Você precisa estar logado para se inscrever.",
        variant: "destructive",
      });
      return;
    }
    const tournamentType = (tournament as any)?.type || 'standard';
    if (tournamentType === 'liga' && !selectedTeam) {
      toast({
        title: "Seleção de Time Necessária",
        description: "Por favor, escolha um time disponível para participar.",
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
  
  // Check-in availability logic
  const now = new Date();
  const eventDate = tournament?.event_date ? new Date(tournament.event_date) : null;
  const isCheckInOpen = eventDate && 
    tournamentModel === 'Diário' &&
    tournament?.status === 'Aberto' &&
    now >= new Date(eventDate.getTime() - 30 * 60000); // 30 mins before

  const userParticipation = participants?.find(p => p.user_id === user?.id);
  const isUserCheckedIn = userParticipation?.checked_in;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        <Link to="/tournaments">
          <Button variant="ghost" className="mb-8 hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Torneios
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tournament ? (
          <div className="max-w-4xl mx-auto">
            {tournament.banner_image_url && (
              <div className="relative h-96 rounded-lg overflow-hidden mb-8">
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
                  
                  {/* Host Info */}
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
                        {tournament.event_date ? format(new Date(tournament.event_date), "dd 'de' MMMM, yyyy 'às' HH:mm", {
                          locale: ptBR,
                        }) : 'Data não definida'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <span>
                        {tournament.num_decks_allowed} deck{tournament.num_decks_allowed > 1 ? 's' : ''} por jogador
                      </span>
                    </div>
                  </div>
                </div>
                
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                    tournament.status === "Aberto"
                      ? "bg-primary/90 text-primary-foreground"
                      : "bg-muted/90 text-muted-foreground"
                  }`}
                >
                  {tournament.status}
                </span>
              </div>

              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-foreground whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </div>

              {/* Decklist Management for registered users */}
              {user && isRegistered && tournament.is_decklist_required && (
                <>
                  {tournament.num_decks_allowed > 1 ? (
                    <ManageMultipleDecklists
                      user={user}
                      tournamentId={tournament.id}
                      tournamentStatus={tournament.status}
                      tournamentEventDate={tournament.event_date}
                      numDecksAllowed={tournament.num_decks_allowed}
                      tournamentType={tournamentType}
                    />
                  ) : (
                    <ManageDecklist 
                      user={user} 
                      tournamentId={tournament.id}
                      tournamentStatus={tournament.status}
                      tournamentEventDate={tournament.event_date}
                      tournamentType={tournamentType}
                    />
                  )}
                </>
              )}

              {/* Team Selection for Liga Mode */}
              {tournamentType === 'liga' && (
                <div className="mb-6">
                   <h3 className="text-xl font-bold mb-4">Seleção de Time (Liga)</h3>
                   {isRegistered ? (
                     <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                        {participants?.find(p => p.user_id === user?.id)?.team_selection ? (
                          <>
                             <img 
                               src={getTeamLogoUrl(participants.find(p => p.user_id === user?.id)?.team_selection as string)} 
                               alt="Team Logo" 
                               className="w-16 h-16 object-contain"
                             />
                             <div>
                               <p className="font-semibold text-lg">Você está defendendo:</p>
                               <p className="text-primary text-xl font-bold">{participants.find(p => p.user_id === user?.id)?.team_selection}</p>
                             </div>
                          </>
                        ) : (
                          <p>Você está inscrito, mas sem time selecionado.</p>
                        )}
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <label className="text-sm font-medium">Escolha seu time para defender:</label>
                       <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={registrationMutation.isPending}>
                        <SelectTrigger className="w-full md:w-[300px]">
                          <SelectValue placeholder="Selecione um time..." />
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
                       <p className="text-xs text-muted-foreground">Times já selecionados por outros jogadores não aparecem na lista.</p>
                     </div>
                   )}
                </div>
              )}

              {/* Banishment Mode UI */}
              {tournamentType === 'banimento' && (
                <div className="mb-8 p-4 border rounded-lg bg-muted/10">
                  {!isRegistered ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Ban className="h-6 w-6 text-destructive" />
                            <h3 className="text-xl font-bold">Seleção de Banimento</h3>
                        </div>
                        <p className="text-muted-foreground mb-4">
                            Para participar deste torneio, você deve selecionar <strong>{(tournament as any).banishment_count}</strong> cartas que serão banidas.
                            As cartas escolhidas por todos os participantes formarão a banlist oficial do evento.
                        </p>
                        
                        <Accordion type="single" collapsible className="w-full border rounded-lg bg-card px-4">
                          <AccordionItem value="current-bans" className="border-b-0">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="font-semibold text-destructive">Ver cartas já banidas ({existingBans?.length || 0})</span>
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
                            <h3 className="text-lg font-bold mb-2">Selecione seu Deck</h3>
                            <Select
                                value={selectedDeckId}
                                onValueChange={setSelectedDeckId}
                                disabled={registrationMutation.isPending}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Escolha o deck que usará no torneio..." />
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
                                            Você não tem decks salvos. Crie um deck antes de se inscrever.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                                * Seu deck será enviado automaticamente ao confirmar a inscrição.
                            </p>
                        </div>
                        )}
                    </div>
                  ) : (
                    <CustomBanlist tournamentId={tournament.id} />
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                {/* CHECK-IN BUTTON */}
                {user && isRegistered && tournamentModel === 'Diário' && (
                    <div className="w-full sm:w-auto">
                        {isUserCheckedIn ? (
                             <Button disabled className="w-full bg-green-600/20 text-green-600 border-green-600/50 text-lg py-6">
                                <CheckCircle className="mr-2 h-5 w-5" />
                                Check-in Confirmado
                             </Button>
                        ) : (
                            <Button 
                                onClick={() => checkInMutation.mutate()}
                                disabled={!isCheckInOpen || checkInMutation.isPending}
                                className={`w-full text-lg py-6 ${isCheckInOpen ? "animate-pulse bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                variant={isCheckInOpen ? "default" : "secondary"}
                            >
                                {checkInMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                {isCheckInOpen ? "Fazer Check-in Agora!" : "Aguardando horário de Check-in"}
                            </Button>
                        )}
                        {!isUserCheckedIn && !isCheckInOpen && tournament.status === 'Aberto' && (
                             <p className="text-xs text-center mt-2 text-muted-foreground">
                                 O check-in abre 30 minutos antes do início ({tournament.event_date ? format(new Date(new Date(tournament.event_date).getTime() - 30 * 60000), "HH:mm") : "??"}).
                             </p>
                        )}
                    </div>
                )}

                              {/* Show "Login/Register to Enroll" button if user is not logged in */}
                              {!user && (
                                <Button
                                  onClick={() => navigate("/auth")}
                                  className="w-full sm:w-auto flex-grow bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6"
                                >
                                  Faça login ou cadastre-se no site para se inscrever !
                                </Button>
                              )}
                
                              {/* Show registration button ONLY if tournament is open and user is not registered */}
                              {user && !isRegistered && tournament.status === 'Aberto' && (
                                <Button
                                  onClick={handleRegister}
                                  disabled={registrationMutation.isPending}
                                  className="w-full sm:w-auto flex-grow bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6"
                                >
                                  {registrationMutation.isPending ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  ) : null}
                                  Inscrever-se no Torneio
                                </Button>
                              )}
                {/* Show "Registrations Closed" if tournament is not open and user is not registered */}
                {user && !isRegistered && tournament.status !== 'Aberto' && (
                  <Button variant="outline" disabled className="w-full sm:w-auto flex-grow text-lg py-6">
                    Inscrições Encerradas
                  </Button>
                )}
                
                {/* Always show external link if it exists */}
                {tournament.registration_link && (
                    <a
                    href={tournament.registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button variant="outline" className="w-full text-lg py-6">
                      Link do Discord / Organização
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Torneio não encontrado.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentDetail;
