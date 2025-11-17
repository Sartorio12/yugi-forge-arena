import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TournamentCard from "@/components/TournamentCard";
import { Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export const UpcomingTournaments = () => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["upcoming-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "Aberto")
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(2);

      if (error) throw error;
      return data as Tables<"tournaments">[];
    },
  });

  return (
    <section className="py-4 md:py-6 bg-[url('/bg-main.png')] bg-cover border border-gray-800 rounded-lg p-4">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Próximos Torneios
        </h2>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tournaments && tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                id={tournament.id}
                title={tournament.title}
                bannerImageUrl={tournament.banner_image_url || undefined}
                eventDate={tournament.event_date}
                status={tournament.status}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Nenhum torneio aberto agendado no momento. Volte em breve!</p>
          </div>
        )}
      </div>
    </section>
  );
};