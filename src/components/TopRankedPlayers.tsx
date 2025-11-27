import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDisplay from "./UserDisplay";

interface PlayerRanking {
  user_id: string;
  username: string;
  avatar_url: string;
  total_wins: number;
  level: number;
  clan_tag: string | null;
}

export const TopRankedPlayers = () => {
  const { data: players, isLoading } = useQuery({
    queryKey: ["topRankedPlayers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rankings_view")
        .select('*')
        .limit(10);
        
      if (error) throw error;
      return data as PlayerRanking[];
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
    <section className="py-8 md:py-12 bg-[url('/bg-main.png')] bg-cover border border-gray-800 rounded-lg p-4">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-6">
          Top 10 Duelistas do Ranking
        </h2>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : players && players.length > 0 ? (
          <Card className="bg-gray-800/50 border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] text-center px-1">Rank</TableHead>
                    <TableHead className="text-center">Duelista</TableHead>
                    <TableHead className="w-[50px] text-center px-1">Nível</TableHead>
                    <TableHead className="w-[60px] text-center px-1">Vitórias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player, index) => (
                    <TableRow key={player.user_id}>
                      <TableCell className={`text-center font-bold text-base px-1 ${getRankColor(index + 1)}`}>
                        #{index + 1}
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Link to={`/profile/${player.user_id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar_url} alt={player.username} />
                            <AvatarFallback>{player.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs">
                            <UserDisplay profile={player} clan={player.clan_tag ? { tag: player.clan_tag } : null} />
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-base px-1 text-primary">{player.level}</TableCell>
                      <TableCell className="text-center font-semibold text-sm px-1">{player.total_wins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Nenhum duelista no ranking ainda. Comece a jogar!</p>
          </div>
        )}
      </div>
    </section>
  );
};