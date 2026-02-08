import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Trophy, ChevronRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ActiveBracketsWidget = () => {
  const { data: activeTournaments, isLoading } = useQuery({
    queryKey: ["active-brackets-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, format, status")
        .is("deleted_at", null)
        .in("status", ["Aberto", "Em Andamento"])
        .not("format", "is", null) // Torneios que tenham algum formato definido
        .order("event_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !activeTournaments || activeTournaments.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          Chaveamentos Ativos
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTournaments.map((tournament) => (
          <Card key={tournament.id} className="p-4 bg-muted/10 border-primary/20 hover:border-primary/40 transition-all group overflow-hidden relative">
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase">
                  {tournament.format === 'groups' ? 'Fase de Grupos' : tournament.format === 'swiss' ? 'Suíço' : 'Mata-mata'}
                </Badge>
                {tournament.status === 'Em Andamento' && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
              
              <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {tournament.title}
              </h4>

              <Link to={
                tournament.format === 'groups' 
                  ? `/tournaments/${tournament.id}/groups` 
                  : tournament.format === 'single_elimination' 
                    ? `/tournaments/${tournament.id}/bracket`
                    : `/tournaments/${tournament.id}`
              }>
                <Button variant="secondary" size="sm" className="w-full h-8 text-xs font-bold gap-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all">
                  <Trophy className="h-3 w-3" />
                  {tournament.format === 'single_elimination' ? 'Ver Chaveamento' : 'Ver Classificação'}
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </Button>
              </Link>
            </div>
            
            {/* Subtle BG Icon */}
            <Trophy className="absolute -right-4 -bottom-4 h-20 w-20 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </Card>
        ))}
      </div>
    </div>
  );
};
