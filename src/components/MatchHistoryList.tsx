import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, Calendar, Trophy, XCircle, Swords } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-4">
      {history.map((match: any) => (
        <Card key={match.match_id} className={`overflow-hidden border-l-4 ${match.result === 'WIN' ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            
            {/* Tournament Info */}
            <div className="flex flex-col gap-1 min-w-[120px] md:min-w-[200px]">
              <Link to={`/tournaments/${match.tournament_id}`} className="font-bold hover:underline truncate">
                {match.tournament_title}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(match.tournament_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                <span className="hidden md:inline">•</span>
                <span className="truncate max-w-[100px]">{match.round_name}</span>
              </div>
            </div>

            {/* Result (Center) */}
            <div className={`flex flex-col items-center justify-center font-black uppercase text-sm md:text-lg ${match.result === 'WIN' ? 'text-green-600' : 'text-red-600'}`}>
                <div className="flex items-center gap-2">
                  {match.result === 'WIN' ? 'Vitória' : 'Derrota'}
                  {match.is_wo && (
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${match.result === 'WIN' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}
                      title={match.result === 'WIN' ? "Venceu por ausência do adversário" : "Perdeu por ausência/desistência"}
                    >
                      W.O.
                    </Badge>
                  )}
                </div>
                {match.result === 'WIN' ? <Trophy className="h-4 w-4 md:h-6 md:w-6 mt-1" /> : <XCircle className="h-4 w-4 md:h-6 md:w-6 mt-1" />}
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-3 justify-end text-right min-w-[120px] md:min-w-[200px]">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">Adversário</span>
                <Link to={`/profile/${match.opponent_id}`} className="font-medium hover:underline truncate max-w-[100px] md:max-w-[150px]">
                    {match.opponent_clan_tag && <span className="text-primary mr-1">[{match.opponent_clan_tag}]</span>}
                    {match.opponent_name}
                </Link>
              </div>
              <FramedAvatar userId={match.opponent_id} avatarUrl={match.opponent_avatar} frameUrl={match.opponent_frame} sizeClassName="h-8 w-8 md:h-10 md:w-10" />
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
};
