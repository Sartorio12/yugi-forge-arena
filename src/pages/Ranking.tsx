import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Loader2, Trophy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RankingPageProps {
  user: User | null;
  onLogout: () => void;
}

interface PlayerRanking {
  user_id: string;
  username: string;
  avatar_url: string;
  total_wins: number;
  total_points: number;
}

const RankingPage = ({ user, onLogout }: RankingPageProps) => {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ["playerRankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rankings_view")
        .select("*")
        .gt("total_points", 0);

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
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-12">
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  Ranking de Jogadores
                </CardTitle>
                <CardDescription>
                  Jogadores com mais pontos acumulados em torneios.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rankings && rankings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-center">Rank</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((player, index) => (
                    <TableRow key={player.user_id}>
                      <TableCell className={`text-center font-bold text-xl ${getRankColor(index + 1)}`}>
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <Link to={`/profile/${player.user_id}`} className="flex items-center gap-4 group">
                          <Avatar>
                            <AvatarImage src={player.avatar_url} alt={player.username} />
                            <AvatarFallback>{player.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium group-hover:underline">{player.username}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">{player.total_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  O ranking ainda está vazio. Nenhum jogador marcou pontos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RankingPage;
