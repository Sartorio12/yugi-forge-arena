import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Calendar, Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Tournament {
  id: number;
  title: string;
  banner_image_url: string | null;
  event_date: string;
  status: string;
  organizer_id: string;
}

export const TournamentHero = () => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["upcoming-tournaments-hero"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          id,
          title,
          banner_image_url,
          event_date,
          status,
          organizer_id
        `)
        .eq("status", "Aberto")
        .is("deleted_at", null)
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as Tournament[];
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] flex items-center justify-center bg-[hsl(0_0%_12%)] rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournaments || tournaments.length === 0) {
    // Empty state fallback to a generic banner
    return (
      <div className="w-full relative rounded-lg border border-border bg-[hsl(0_0%_12%)] flex flex-col items-center justify-center text-center p-6 h-[300px] sm:h-auto sm:aspect-[16/5]">
        <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">Sem Torneios Agendados</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Fique ligado! Novos torneios serão anunciados em breve.
        </p>
        <Button variant="outline" asChild>
          <Link to="/tournaments">Ver Todos os Torneios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {tournaments.map((tournament) => (
            <CarouselItem key={tournament.id}>
              <div className="relative w-full overflow-hidden rounded-lg border border-border group">
                <AspectRatio ratio={16 / 6} className="bg-[hsl(0_0%_12%)]">
                  {/* Background Image */}
                  {tournament.banner_image_url ? (
                    <img
                      src={tournament.banner_image_url}
                      alt={tournament.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-background" />
                  )}
                  
                  {/* Dark Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                    <div className="max-w-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                          Próximo Evento
                        </span>
                        <span className="flex items-center text-xs font-medium text-gray-300">
                          <Calendar className="mr-1 h-3.5 w-3.5" />
                          {format(new Date(tournament.event_date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
                        {tournament.title}
                      </h2>

                      <div className="pt-2">
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold" asChild>
                          <Link to={`/tournaments/${tournament.id}`}>
                            Inscrever-se Agora
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </AspectRatio>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {tournaments.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-black/50 border-white/10 hover:bg-black/80 text-white" />
            <CarouselNext className="right-4 bg-black/50 border-white/10 hover:bg-black/80 text-white" />
          </>
        )}
      </Carousel>
    </div>
  );
};
