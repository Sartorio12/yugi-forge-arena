import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Calendar, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TournamentDetailProps {
  user: User | null;
  onLogout: () => void;
}

const TournamentDetail = ({ user, onLogout }: TournamentDetailProps) => {
  const { id } = useParams();

  const { data: tournament, isLoading } = useQuery({
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
                        {format(new Date(tournament.event_date), "dd 'de' MMMM, yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
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

              {tournament.status === "Aberto" && (
                <a
                  href={tournament.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6">
                    Inscreva-se Agora
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
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
