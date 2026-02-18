import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, Calendar, Trophy, XCircle, Swords } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchHistoryListProps {
  userId: string;
}

export const MatchHistoryList = ({ userId }: MatchHistoryListProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["matchHistory", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_player_match_history", {
        p_user_id: userId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-secondary/10">
        <Swords className="mx-auto h-12 w-12 mb-4 opacity-20" />
        <p>Nenhuma partida encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((match: any) => (
        <Card key={match.match_id} className={`overflow-hidden border-l-4 ${match.result === 'WIN' ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
          <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Tournament Info */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <Link to={`/tournaments/${match.tournament_id}`} className="font-bold text-sm md:text-base hover:underline truncate text-foreground/90">
                {match.tournament_title}
              </Link>
              <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground uppercase font-medium tracking-tight">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(match.tournament_date), "dd/MM/yy", { locale: ptBR })}</span>
                <span>•</span>
                <span className="truncate">{match.round_name}</span>
              </div>
            </div>

            {/* Result & Score (Center on desktop, middle on mobile) */}
            <div className="flex items-center justify-between sm:justify-center bg-black/20 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                <div className={cn(
                    "flex flex-col items-center justify-center font-black uppercase",
                    match.result === 'WIN' ? 'text-green-500' : 'text-red-500'
                )}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs md:text-lg tracking-tighter">{match.result === 'WIN' ? 'Vitória' : 'Derrota'}</span>
                      {match.is_wo && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                              "text-[8px] h-4 px-1 font-black",
                              match.result === 'WIN' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                          )}
                        >
                          W.O.
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-muted-foreground mt-0.5">
                        <span className={cn(match.result === 'WIN' ? "text-green-500/80" : "")}>{match.score_p1 ?? 0}</span>
                        <span>-</span>
                        <span className={cn(match.result === 'LOSS' ? "text-red-500/80" : "")}>{match.score_p2 ?? 0}</span>
                    </div>
                </div>
                <div className="sm:hidden">
                    {match.result === 'WIN' ? <Trophy className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                </div>
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-3 justify-end text-right flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] md:text-xs text-muted-foreground uppercase font-black tracking-widest opacity-50">Adversário</span>
                <Link to={`/profile/${match.opponent_id}`} className="font-bold text-xs md:text-base hover:underline truncate max-w-[120px] md:max-w-[150px] text-primary/90">
                    {match.opponent_clan_tag && <span className="mr-1">[{match.opponent_clan_tag}]</span>}
                    {match.opponent_name}
                </Link>
              </div>
              <div className="shrink-0">
                <FramedAvatar 
                    userId={match.opponent_id} 
                    avatarUrl={match.opponent_avatar} 
                    frameUrl={match.opponent_frame} 
                    sizeClassName="h-9 w-9 md:h-10 md:w-10" 
                />
              </div>
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
};
