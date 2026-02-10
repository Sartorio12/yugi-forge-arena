import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, ArrowLeft, Trophy, Users2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { getTeamLogoUrl } from "@/constants/teams";

interface GroupStanding {
  group_name: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  clan_tag: string | null;
  team_selection: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  points: number;
  is_disqualified?: boolean;
  game_wins: number;
  game_losses: number;
  game_difference: number;
}

interface GroupStandingsPageProps {
  user: User | null;
  onLogout: () => void;
}

const GroupStandingsPage = ({ user, onLogout }: GroupStandingsPageProps) => {
  const { id } = useParams<{ id: string }>();

  const { data: tournament } = useQuery({
    queryKey: ["tournament_basic_standings", id],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("title, type").eq("id", Number(id)).single();
      return data;
    }
  });

  const { data: standings, isLoading } = useQuery({
    queryKey: ["group_standings", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tournament_group_standings", {
        p_tournament_id: Number(id)
      });
      if (error) throw error;
      
      // We also need team_selection which might not be in the RPC return type currently.
      // Let's enrichment the data by fetching team_selection from tournament_participants
      const { data: participants } = await supabase
        .from("tournament_participants")
        .select("user_id, team_selection")
        .eq("tournament_id", Number(id));
      
      const teamMap = new Map(participants?.map(p => [p.user_id, p.team_selection]));
      
      return (data as any[]).map(s => ({
        ...s,
        team_selection: teamMap.get(s.user_id) || null
      })) as GroupStanding[];
    },
    enabled: !!id,
  });

  // Group the flat list by group_name
  const groups = standings?.reduce((acc: Record<string, GroupStanding[]>, curr) => {
    if (!acc[curr.group_name]) acc[curr.group_name] = [];
    acc[curr.group_name].push(curr);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/tournaments/${id}`}>
            <Button variant="ghost" className="hover:text-primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Torneio
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Fase de Grupos
            </h1>
            <p className="text-muted-foreground text-sm">{tournament?.title}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : groups && Object.keys(groups).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
            {Object.keys(groups).sort().map((groupName) => (
              <Card key={groupName} className="border-primary/20 bg-gradient-card overflow-hidden shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <CardHeader className="bg-primary/10 border-b border-primary/10 py-3">
                  <CardTitle className="text-center text-xl font-black uppercase tracking-wider text-primary">
                    {groupName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-black/20">
                      <TableRow className="hover:bg-transparent border-b border-primary/10">
                        <TableHead className="w-[50px] text-center font-bold text-xs">#</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Duelista</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold" title="Partidas Jogadas">J</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold text-green-500" title="Vitórias">V</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold text-red-500" title="Derrotas">D</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold" title="Game Wins (Sets Ganhos)">GW</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold" title="Game Losses (Sets Perdidos)">GL</TableHead>
                        <TableHead className="w-[40px] text-center text-xs font-bold text-yellow-500" title="Saldo de Games (SG)">SG</TableHead>
                        <TableHead className="w-[60px] text-center text-xs font-black text-primary bg-primary/5" title="Pontos">PTS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups[groupName].map((player, index) => (
                        <TableRow key={player.user_id} className={`border-b border-white/5 hover:bg-white/5 ${index < 2 ? 'bg-green-500/5' : ''}`}>
                          <TableCell className="text-center font-medium relative">
                            {index + 1}
                            {index < 2 && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-green-500" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 py-1">
                              <FramedAvatar 
                                userId={player.user_id}
                                username={player.username}
                                avatarUrl={player.avatar_url}
                                sizeClassName="h-8 w-8"
                              />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-sm truncate max-w-[120px] ${player.is_disqualified ? 'line-through text-muted-foreground' : ''}`}>
                                    {player.username}
                                  </span>
                                  {player.is_disqualified && (
                                    <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1 rounded font-black">
                                      W.O.
                                    </span>
                                  )}
                                  {tournament?.type === 'liga' && player.team_selection && (
                                    <img 
                                      src={getTeamLogoUrl(player.team_selection)} 
                                      className="w-6 h-6 object-contain" 
                                      alt={player.team_selection}
                                      title={`Time: ${player.team_selection}`}
                                    />
                                  )}
                                </div>
                                {player.clan_tag && <span className="text-[10px] text-muted-foreground font-bold">[{player.clan_tag}]</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium text-muted-foreground">{player.matches_played}</TableCell>
                          <TableCell className="text-center font-bold text-green-500">{player.wins}</TableCell>
                          <TableCell className="text-center font-medium text-red-500/70">{player.losses}</TableCell>
                          <TableCell className="text-center font-medium text-muted-foreground">{player.game_wins}</TableCell>
                          <TableCell className="text-center font-medium text-muted-foreground">{player.game_losses}</TableCell>
                          <TableCell className={`text-center font-bold ${player.game_difference > 0 ? 'text-green-500' : player.game_difference < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {player.game_difference > 0 ? `+${player.game_difference}` : player.game_difference}
                          </TableCell>
                          <TableCell className="text-center font-black text-lg text-primary bg-primary/5">{player.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/5 border-2 border-dashed rounded-xl">
            <div className="bg-muted/20 p-4 rounded-full">
              <Users2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sorteio Pendente</h3>
              <p className="text-muted-foreground">Os grupos deste torneio ainda não foram definidos ou sorteados.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GroupStandingsPage;
