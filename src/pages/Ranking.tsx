import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Loader2, Trophy, Swords, Users } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FramedAvatar } from "@/components/FramedAvatar";
import UserDisplay from "@/components/UserDisplay";
import { useTranslation } from "react-i18next";

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
  clan_tag: string | null;
  level: number;
  equipped_frame_url: string | null;
}

interface ClanRanking {
  clan_id: number;
  clan_name: string;
  clan_tag: string;
  clan_image_url: string | null;
  total_clan_points: number;
}

const RankingPage = ({ user, onLogout }: RankingPageProps) => {
  const { t } = useTranslation();
  const { data: playerRankings, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["playerRankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rankings_view")
        .select("*")
        .order("total_points", { ascending: false });
      if (error) throw error;
      return data as PlayerRanking[];
    },
  });

  const { data: clanRankings, isLoading: isLoadingClans } = useQuery({
    queryKey: ["clanRankingsFull"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clan_rankings_view")
        .select("*")
        .order("total_clan_points", { ascending: false });
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
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-12">
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  {t('ranking_page.title')}
                </CardTitle>
                <CardDescription>
                  {t('ranking_page.subtitle')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="players" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 mb-6">
                <TabsTrigger value="players" className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  {t('ranking_page.players_tab')}
                </TabsTrigger>
                <TabsTrigger value="clans" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('ranking_page.clans_tab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="players">
                {isLoadingPlayers ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : playerRankings && playerRankings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] text-center">{t('ranking_page.rank')}</TableHead>
                        <TableHead>{t('ranking_page.player')}</TableHead>
                        <TableHead className="text-right">{t('ranking_page.points')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playerRankings.map((player, index) => (
                        <TableRow key={player.user_id}>
                          <TableCell className={`text-center font-bold text-xl ${getRankColor(index + 1)}`}>
                            #{index + 1}
                          </TableCell>
                          <TableCell>
                            <Link to={`/profile/${player.user_id}`} className="flex items-center gap-4 group">
                              <FramedAvatar
                                userId={player.user_id}
                                avatarUrl={player.avatar_url}
                                frameUrl={player.equipped_frame_url}
                                username={player.username}
                                sizeClassName="h-10 w-10"
                              />
                              <span className="font-medium group-hover:underline">
                                <UserDisplay profile={{ ...player, id: player.user_id }} clan={player.clan_tag ? { tag: player.clan_tag } : null} />
                              </span>
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
                      {t('ranking_page.no_players')}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="clans">
                {isLoadingClans ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : clanRankings && clanRankings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] text-center">{t('ranking_page.rank')}</TableHead>
                        <TableHead>{t('ranking_page.clan')}</TableHead>
                        <TableHead className="text-right">{t('ranking_page.points')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clanRankings.map((clan, index) => (
                        <TableRow key={clan.clan_id}>
                          <TableCell className={`text-center font-bold text-xl ${getRankColor(index + 1)}`}>
                            #{index + 1}
                          </TableCell>
                          <TableCell>
                            <Link to={`/clans/${clan.clan_id}`} className="flex items-center gap-4 group">
                              <FramedAvatar
                                avatarUrl={clan.clan_image_url}
                                username={clan.clan_name}
                                sizeClassName="h-10 w-10 aspect-square"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium group-hover:underline">
                                  {clan.clan_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  [{clan.clan_tag}]
                                </span>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">{clan.total_clan_points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg">
                      {t('ranking_page.no_clans')}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RankingPage;