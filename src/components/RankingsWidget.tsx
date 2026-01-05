import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Trophy, Users, Swords } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from "./FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDisplay from "./UserDisplay";

interface PlayerRanking {
  user_id: string;
  username: string;
  avatar_url: string;
  total_wins: number;
  level: number;
  clan_tag: string | null;
  equipped_frame_url: string | null;
}

interface ClanRanking {
  clan_id: number;
  clan_name: string;
  clan_tag: string;
  clan_image_url: string | null;
  total_clan_points: number;
}

export const RankingsWidget = () => {
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["topRankedPlayersWidget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rankings_view")
        .select('*')
        .limit(5);
        
      if (error) throw error;
      return data as PlayerRanking[];
    },
  });

  const { data: clans, isLoading: isLoadingClans } = useQuery({
    queryKey: ["topRankedClansWidget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clan_rankings_view")
        .select('*')
        .limit(5);
      if (error) throw error;
      return data as ClanRanking[];
    },
  });

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-yellow-600";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className="bg-[hsl(0_0%_12%)] border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-primary" />
          Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40">
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Duelistas
            </TabsTrigger>
            <TabsTrigger value="clans" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clãs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            {isLoadingPlayers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : players && players.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[40px] text-center px-1">Rank</TableHead>
                    <TableHead className="text-left px-2">Duelista</TableHead>
                    <TableHead className="w-[60px] text-center px-1">Vitórias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player, index) => (
                    <TableRow key={player.user_id} className="border-border/50 hover:bg-white/5">
                      <TableCell className={`text-center font-bold text-sm px-1 ${getRankColor(index + 1)}`}>
                        #{index + 1}
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Link to={`/profile/${player.user_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <FramedAvatar
                            userId={player.user_id}
                            avatarUrl={player.avatar_url}
                            frameUrl={player.equipped_frame_url}
                            username={player.username}
                            sizeClassName="h-8 w-8 aspect-square"
                          />
                          <span className="font-medium text-xs truncate max-w-[120px]">
                            <UserDisplay profile={player} clan={player.clan_tag ? { tag: player.clan_tag } : null} />
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs px-1">{player.total_wins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-black/20 rounded-lg border border-dashed border-border/50">
                <Trophy className="mx-auto h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">A temporada iniciará em breve</p>
                <p className="text-xs text-muted-foreground/60">Seja o primeiro a pontuar!</p>
              </div>
            )}
            <div className="mt-4 text-center">
              <Link to="/ranking" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Ver Ranking Completo
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="clans" className="mt-4">
            {isLoadingClans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clans && clans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[40px] text-center px-1">Rank</TableHead>
                    <TableHead className="text-left px-2">Clã</TableHead>
                    <TableHead className="w-[60px] text-center px-1">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clans.map((clan, index) => (
                    <TableRow key={clan.clan_id} className="border-border/50 hover:bg-white/5">
                      <TableCell className={`text-center font-bold text-sm px-1 ${getRankColor(index + 1)}`}>
                        #{index + 1}
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Link to={`/clans/${clan.clan_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <FramedAvatar
                            avatarUrl={clan.clan_image_url}
                            username={clan.clan_name}
                            sizeClassName="h-8 w-8 aspect-square"
                          />
                          <span className="font-medium text-xs truncate max-w-[120px]">
                            [{clan.clan_tag}] {clan.clan_name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-primary text-xs px-1">{clan.total_clan_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-black/20 rounded-lg border border-dashed border-border/50">
                <Users className="mx-auto h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">A temporada de Clãs iniciará em breve</p>
                <p className="text-xs text-muted-foreground/60">Reúna seus aliados!</p>
              </div>
            )}
            <div className="mt-4 text-center">
              <Link to="/ranking" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Ver Ranking Completo
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
