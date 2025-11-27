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

interface ClanRanking {
  clan_id: number;
  clan_name: string;
  clan_tag: string;
  clan_image_url: string | null;
  total_clan_points: number;
}

export const TopRankedClans = () => {
  const { data: clans, isLoading } = useQuery({
    queryKey: ["topRankedClans"],
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
      case 1: return "text-yellow-400";
      case 2: return "text-gray-400";
      case 3: return "text-yellow-600";
      default: return "text-foreground";
    }
  };

  return (
    <section className="py-8 md:py-12 bg-[url('/bg-main.png')] bg-cover border border-gray-800 rounded-lg p-4">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-6">
          Top 5 Clãs do Ranking
        </h2>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clans && clans.length > 0 ? (
          <Card className="bg-gray-800/50 border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center px-1">Rank</TableHead>
                    <TableHead className="text-center">Clã</TableHead>
                    <TableHead className="w-[100px] text-center px-1">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clans.map((clan, index) => (
                    <TableRow key={clan.clan_id}>
                      <TableCell className={`text-center font-bold text-base px-1 ${getRankColor(index + 1)}`}>
                        #{index + 1}
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Link to={`/clans/${clan.clan_id}`} className="flex items-center justify-center gap-2 hover:text-primary transition-colors">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={clan.clan_image_url} alt={clan.clan_name} />
                            <AvatarFallback>{clan.clan_tag}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs">
                            [{clan.clan_tag}] {clan.clan_name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-primary text-base px-1">{clan.total_clan_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground mt-4">Nenhum clã no ranking ainda.</p>
        )}
      </div>
    </section>
  );
};
