import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, ArrowLeft, Trophy, Sigma, Swords, Calendar, Zap } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

interface SwissStanding {
  user_id: string;
  username: string;
  avatar_url: string | null;
  clan_tag: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  buchholz: number;
  game_difference: number;
}

interface Match {
  id: number;
  round_number: number;
  round_name: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  is_wo: boolean;
  player1: any;
  player2: any;
}

interface SwissStandingsPageProps {
  user: User | null;
  onLogout: () => void;
}

const SwissStandingsPage = ({ user, onLogout }: SwissStandingsPageProps) => {
  const { id } = useParams<{ id: string }>();

  const { data: tournament } = useQuery({
    queryKey: ["tournament_basic_swiss", id],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("title").eq("id", Number(id)).single();
      return data;
    }
  });

  const { data: standings, isLoading: isLoadingStandings } = useQuery({
    queryKey: ["swiss_standings", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tournament_swiss_standings", {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
      return data as SwissStanding[];
    },
    enabled: !!id,
  });

  const { data: matches, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["swiss_matches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          id,
          round_number,
          round_name,
          player1_id,
          player2_id,
          winner_id,
          is_wo,
          player1:player1_id(username, avatar_url, clan_members(clans(tag))),
          player2:player2_id(username, avatar_url, clan_members(clans(tag)))
        `)
        .eq("tournament_id", Number(id))
        .order("round_number", { ascending: false })
        .order("id", { ascending: true });

      if (error) throw error;
      return data as any[] as Match[];
    },
    enabled: !!id,
  });

  const matchesByRound = matches?.reduce((acc: Record<number, Match[]>, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {});

  const sortedRoundNumbers = matchesByRound ? Object.keys(matchesByRound).map(Number).sort((a, b) => b - a) : [];

  const isLoading = isLoadingStandings || isLoadingMatches;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/tournaments/${id}`}>
            <Button variant="ghost" className="hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Classificação Swiss
            </h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{tournament?.title}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Table Card */}
            <Card className="border-border bg-card/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-muted/20 border-b py-4">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <Sigma className="h-4 w-4" /> Ranking do Torneio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-black/20 hover:bg-black/20 border-b border-white/5">
                        <TableHead className="w-[60px] text-center font-bold">#</TableHead>
                        <TableHead>Duelista</TableHead>
                        <TableHead className="text-center">J</TableHead>
                        <TableHead className="text-center text-green-500">V</TableHead>
                        <TableHead className="text-center text-red-500">D</TableHead>
                        <TableHead className="text-center font-bold text-primary">PTS</TableHead>
                        <TableHead className="text-center text-muted-foreground" title="Saldo de Games (Vitórias - Derrotas)">G-D</TableHead>
                        <TableHead className="text-center text-muted-foreground">Buchholz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings?.map((player, index) => (
                        <TableRow key={player.user_id} className="hover:bg-primary/5 transition-colors border-b border-white/5">
                          <TableCell className="text-center font-black text-muted-foreground/40">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FramedAvatar 
                                userId={player.user_id}
                                avatarUrl={player.avatar_url}
                                username={player.username}
                                sizeClassName="h-9 w-9"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-sm flex items-center gap-2">
                                  {player.username}
                                  {index === 0 && <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                </span>
                                {player.clan_tag && (
                                  <span className="text-[10px] text-primary font-bold tracking-wider">[{player.clan_tag}]</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">{player.matches_played}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-green-500/80">{player.wins}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-red-500/80">{player.losses}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-primary">{player.points}</span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-muted-foreground">
                            {player.game_difference > 0 ? `+${player.game_difference}` : player.game_difference}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {player.buchholz}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pairings Section - Redesigned */}
            {sortedRoundNumbers.length > 0 && (
              <div className="space-y-10 pb-20">
                <div className="flex items-center gap-4">
                    <Swords className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Confrontos</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                </div>

                {sortedRoundNumbers.map((roundNum) => (
                  <div key={roundNum} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">
                            {matchesByRound![roundNum][0].round_name}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {matchesByRound![roundNum].map((match) => {
                        const tag1 = (match.player1 as any)?.clan_members?.[0]?.clans?.tag;
                        const tag2 = (match.player2 as any)?.clan_members?.[0]?.clans?.tag;
                        const isFinished = !!match.winner_id;

                        return (
                          <div 
                            key={match.id} 
                            className={`flex items-center bg-card/20 border border-white/5 rounded-xl p-3 transition-all hover:border-primary/30 ${isFinished ? 'opacity-75' : 'ring-1 ring-primary/10 shadow-lg shadow-primary/5'}`}
                          >
                            {/* P1 */}
                            <div className="flex-1 flex items-center gap-3 overflow-hidden">
                                <FramedAvatar userId={match.player1_id} avatarUrl={match.player1?.avatar_url} username={match.player1?.username} sizeClassName="h-10 w-10 shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className={`text-sm font-black truncate ${match.winner_id === match.player1_id ? 'text-yellow-500' : ''}`}>
                                        {match.player1?.username || "???"}
                                    </span>
                                    {tag1 && <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">[{tag1}]</span>}
                                </div>
                                {match.winner_id === match.player1_id && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                            </div>

                            {/* VS */}
                            <div className="px-4 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-black text-muted-foreground/40 italic">VS</span>
                                {match.is_wo && (
                                    <span className="text-[7px] font-bold text-yellow-600 bg-yellow-500/10 px-1 rounded border border-yellow-500/20 mt-1">W.O.</span>
                                )}
                            </div>

                            {/* P2 */}
                            <div className="flex-1 flex items-center justify-end gap-3 overflow-hidden text-right">
                                {match.winner_id === match.player2_id && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                                <div className="flex flex-col overflow-hidden">
                                    <span className={`text-sm font-black truncate ${match.winner_id === match.player2_id ? 'text-yellow-500' : ''}`}>
                                        {match.player2?.username || (match.player1_id && !match.player2_id ? "--- BYE ---" : "???")}
                                    </span>
                                    {tag2 && <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">[{tag2}]</span>}
                                </div>
                                <FramedAvatar userId={match.player2_id} avatarUrl={match.player2?.avatar_url} username={match.player2?.username} sizeClassName="h-10 w-10 shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SwissStandingsPage;
