import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FramedAvatar } from "./FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Tournament {
  id: number;
  title: string;
  banner_image_url: string | null;
  event_date: string;
  status: string;
  profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    } | null;
  } | null;
}

export const UpcomingTournaments = () => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["upcoming-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          *,
          profiles:organizer_id (
            id,
            username,
            avatar_url,
            clan_members (
              clans (
                tag
              )
            )
          )
        `)
        .eq("status", "Aberto")
        .is("deleted_at", null)
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data as Tournament[];
    },
  });

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Próximos Torneios
        </h2>
        <Link to="/tournaments" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Ver todos
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournament/${tournament.id}`}
              className="group relative h-48 md:h-56 overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300"
            >
              {/* Background Image with Gradient Overlay */}
              <div className="absolute inset-0">
                {tournament.banner_image_url ? (
                  <img
                    src={tournament.banner_image_url}
                    alt={tournament.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                    <Trophy className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <div className="space-y-2 transform translate-y-0 transition-transform duration-300">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/90 text-black uppercase tracking-wider">
                    Torneio
                  </span>

                  <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 group-hover:text-primary-foreground/90 transition-colors">
                    {tournament.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-300 mt-2">
                    {tournament.profiles && (
                      <div className="flex items-center gap-1.5">
                        <FramedAvatar
                          userId={tournament.profiles.id}
                          avatarUrl={tournament.profiles.avatar_url}
                          username={tournament.profiles.username}
                          sizeClassName="h-4 w-4"
                        />
                        <span className="font-medium truncate max-w-[100px]">
                          {tournament.profiles.clan_members?.clans?.tag && (
                            <span className="text-primary font-bold mr-1">[{tournament.profiles.clan_members.clans.tag}]</span>
                          )}
                          {tournament.profiles.username}
                        </span>
                      </div>
                    )}
                    <span className="text-gray-500">•</span>
                    <span>{format(new Date(tournament.event_date), "d MMM, HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8 sm:py-12 px-4 border-2 border-dashed border-border rounded-lg">
          <Trophy className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-20" />
          <p className="text-sm sm:text-base">Nenhum torneio aberto agendado no momento.</p>
        </div>
      )}
    </section>
  );
};
