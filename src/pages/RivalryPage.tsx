import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { UserSelector } from "@/components/polls/UserSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, Swords, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RivalryPageProps {
  user: User | null;
  onLogout: () => void;
}

export const RivalryPage = ({ user, onLogout }: RivalryPageProps) => {
  const [player1, setPlayer1] = useState<{id: string, username: string, avatar_url: string} | null>(null);
  const [player2, setPlayer2] = useState<{id: string, username: string, avatar_url: string} | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ["rivalry", player1?.id, player2?.id],
    queryFn: async () => {
      if (!player1 || !player2) return null;
      const { data, error } = await supabase.rpc("get_rivalry_history", {
        p_player1_id: player1.id,
        p_player2_id: player2.id
      });
      if (error) throw error;
      return data;
    },
    enabled: !!player1 && !!player2
  });

  const p1Wins = history?.filter(h => h.winner_id === player1?.id).length || 0;
  const p2Wins = history?.filter(h => h.winner_id === player2?.id).length || 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar user={user} onLogout={onLogout} />
      <div className="container mx-auto max-w-4xl py-12 px-4">
        
        <header className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
                <Swords className="h-10 w-10 text-primary" /> Histórico de Rivalidades
            </h1>
            <p className="text-muted-foreground">Compare o desempenho entre dois duelistas.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
            {/* Player 1 Selector */}
            <div className="space-y-4">
                <div className={`p-6 rounded-xl border-2 transition-all ${player1 ? 'border-primary bg-primary/10' : 'border-dashed border-muted'}`}>
                    {player1 ? (
                        <div className="flex flex-col items-center text-center">
                            <FramedAvatar userId={player1.id} avatarUrl={player1.avatar_url} sizeClassName="h-24 w-24 mb-4" />
                            <h2 className="text-2xl font-bold">{player1.username}</h2>
                            <button onClick={() => setPlayer1(null)} className="text-xs text-muted-foreground hover:text-destructive mt-2">Alterar</button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Duelista 1</h3>
                            <UserSelector onSelect={setPlayer1} excludeIds={player2 ? [player2.id] : []} placeholder="Pesquisar..." />
                        </div>
                    )}
                </div>
            </div>

            {/* VS Badge (Desktop) */}
            <div className="hidden md:flex justify-center">
                <div className="bg-destructive text-white font-black text-2xl rounded-full h-16 w-16 flex items-center justify-center shadow-lg border-4 border-background z-10">VS</div>
            </div>

            {/* Player 2 Selector */}
            <div className="space-y-4">
                <div className={`p-6 rounded-xl border-2 transition-all ${player2 ? 'border-primary bg-primary/10' : 'border-dashed border-muted'}`}>
                    {player2 ? (
                        <div className="flex flex-col items-center text-center">
                            <FramedAvatar userId={player2.id} avatarUrl={player2.avatar_url} sizeClassName="h-24 w-24 mb-4" />
                            <h2 className="text-2xl font-bold">{player2.username}</h2>
                            <button onClick={() => setPlayer2(null)} className="text-xs text-muted-foreground hover:text-destructive mt-2">Alterar</button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Duelista 2</h3>
                            <UserSelector onSelect={setPlayer2} excludeIds={player1 ? [player1.id] : []} placeholder="Pesquisar..." />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Results Area */}
        {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : history && player1 && player2 ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-8 md:gap-16 text-4xl md:text-6xl font-black tabular-nums">
                    <div className={p1Wins > p2Wins ? "text-green-500" : "text-muted-foreground"}>{p1Wins}</div>
                    <div className="text-muted-foreground/30 text-2xl">-</div>
                    <div className={p2Wins > p1Wins ? "text-green-500" : "text-muted-foreground"}>{p2Wins}</div>
                </div>

                {/* Match List */}
                <Card>
                    <CardHeader><CardTitle>Histórico de Confrontos</CardTitle></CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">Nenhum confronto registrado entre estes jogadores.</div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((match: any) => (
                                    <div key={match.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border hover:bg-secondary/40 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-lg">{match.tournament_title}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(match.tournament_date), "dd 'de' MMMM, yyyy", { locale: ptBR })} • {match.round_name}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs uppercase text-muted-foreground block mb-1">Vencedor</span>
                                            <div className="flex items-center gap-2 justify-end font-semibold text-green-500">
                                                {match.winner_name}
                                                <FramedAvatar userId={match.winner_id} avatarUrl={match.winner_avatar} sizeClassName="h-6 w-6" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="text-center py-12 opacity-50">
                Selecione dois jogadores para ver o histórico.
            </div>
        )}

      </div>
    </div>
  );
};

export default RivalryPage;
