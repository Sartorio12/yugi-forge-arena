import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Calendar, ExternalLink, Loader2, ArrowLeft, CheckCircle, Layers } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { ManageDecklist } from "@/components/ManageDecklist";
import { ManageMultipleDecklists } from "@/components/ManageMultipleDecklists";

interface TournamentDetailProps {
  user: User | null;
  onLogout: () => void;
}

const TournamentDetail = ({ user, onLogout }: TournamentDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRegistered, setIsRegistered] = useState(false);

  const { data: tournament, isLoading: isLoadingTournament } = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: participants, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ["tournamentParticipants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("user_id")
        .eq("tournament_id", Number(id));
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

      const { error } = await supabase.from("tournament_participants").insert({
        user_id: user.id,
        tournament_id: Number(id),
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Você já está inscrito neste torneio.");
        }
        throw error;
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

  const handleRegister = () => {
    if (!user) {
      toast({
        title: "Ação necessária",
        description: "Você precisa estar logado para se inscrever.",
        variant: "destructive",
      });
      return;
    }
    registrationMutation.mutate();
  };

  const isLoading = isLoadingTournament || isLoadingParticipants;

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
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                    {tournament.title}
                  </h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>
                        {tournament.event_date ? format(new Date(tournament.event_date), "dd 'de' MMMM, yyyy 'às' HH:mm", {
                          locale: ptBR,
                        }) : 'Data não definida'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      <span>
                        {tournament.num_decks_allowed} deck{tournament.num_decks_allowed > 1 ? 's' : ''} por jogador
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
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
                    />
                  ) : (
                    <ManageDecklist 
                      user={user} 
                      tournamentId={tournament.id}
                      tournamentStatus={tournament.status}
                      tournamentEventDate={tournament.event_date}
                    />
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
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
