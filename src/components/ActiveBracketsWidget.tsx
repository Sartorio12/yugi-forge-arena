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
      // We fetch tournaments and use filtered joins to check for existence of matches or groups
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          id, 
          title, 
          format, 
          status,
          event_date,
          tournament_matches(id, round_number),
          tournament_participants(group_name)
        `)
        .is("deleted_at", null)
        .eq("show_on_home", true)
        .in("status", ["Aberto", "Em Andamento"])
        .not("format", "is", null)
        .order("event_date", { ascending: true });

      if (error) throw error;
      
      // Filter in JS: has matches OR at least one participant has a group assigned
      const drawnTournaments = (data || []).filter(t => 
        (t.tournament_matches && t.tournament_matches.length > 0) || 
        (t.tournament_participants && t.tournament_participants.some((p: any) => p.group_name !== null))
      );

      return drawnTournaments.slice(0, 3);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
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
        {activeTournaments.map((tournament) => {
          const hasBrackets = tournament.tournament_matches?.some((m: any) => m.round_number > 0);
          
          let linkTo = `/tournaments/${tournament.id}`;
          let buttonLabel = 'Ver Detalhes';

          if (tournament.format === 'groups') {
            if (hasBrackets) {
              linkTo = `/tournaments/${tournament.id}/bracket`;
              buttonLabel = 'Mata-Mata';
            } else {
              linkTo = `/tournaments/${tournament.id}/groups`;
              buttonLabel = 'Ver Classificação';
            }
          } else if (tournament.format === 'single_elimination') {
            linkTo = `/tournaments/${tournament.id}/bracket`;
            buttonLabel = 'Ver Chaveamento';
          } else if (tournament.format === 'swiss') {
            linkTo = `/tournaments/${tournament.id}/swiss`;
            buttonLabel = 'Ver Classificação';
          }

          return (
            <Card key={tournament.id} className="p-4 bg-muted/10 border-primary/20 hover:border-primary/40 transition-all group overflow-hidden relative">
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase">
                    {tournament.format === 'groups' ? (hasBrackets ? 'Mata-Mata' : 'Fase de Grupos') : tournament.format === 'swiss' ? 'Suíço' : 'Mata-mata'}
                  </Badge>
                  {tournament.status === 'Em Andamento' && (
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                
                <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {tournament.title}
                </h4>

                <Link to={linkTo}>
                  <Button variant="secondary" size="sm" className="w-full h-8 text-xs font-bold gap-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all">
                    <Trophy className="h-3 w-3" />
                    {buttonLabel}
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </Button>
                </Link>
              </div>
              
              {/* Subtle BG Icon */}
              <Trophy className="absolute -right-4 -bottom-4 h-20 w-20 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
