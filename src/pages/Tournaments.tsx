import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TournamentCard from "@/components/TournamentCard";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface TournamentsProps {
  user: User | null;
  onLogout: () => void;
}

const Tournaments = ({ user, onLogout }: TournamentsProps) => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Torneios
          </h1>
          <p className="text-muted-foreground text-lg">
            Participe dos próximos eventos de Yu-Gi-Oh!
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tournaments && tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                id={tournament.id}
                title={tournament.title}
                bannerImageUrl={tournament.banner_image_url}
                eventDate={tournament.event_date}
                status={tournament.status}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Nenhum torneio disponível no momento.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tournaments;
