import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, Users, AlertCircle, TrendingUp } from "lucide-react";
import { FramedAvatar } from "@/components/FramedAvatar";
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface ClanAnalyticsDashboardProps {
  clanId: number;
}

export const ClanAnalyticsDashboard = ({ clanId }: ClanAnalyticsDashboardProps) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["clanAnalytics", clanId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_clan_analytics", { p_clan_id: clanId });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="bg-primary/10 p-2 rounded-full mb-2">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold">{analytics.total_wins}</span>
            <span className="text-xs text-muted-foreground">Vitórias Totais</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-500/10 p-2 rounded-full mb-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-2xl font-bold">{analytics.total_participations}</span>
            <span className="text-xs text-muted-foreground">Participações</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Geral</TabsTrigger>
          <TabsTrigger value="contributors">MVP</TabsTrigger>
          <TabsTrigger value="members">Análise</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Vitórias (Últimos Torneios)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[200px]">
              {analytics.recent_tournaments && analytics.recent_tournaments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.recent_tournaments}>
                    <XAxis dataKey="title" hide />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Line type="monotone" dataKey="total_wins" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Vitórias" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados suficientes.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributors">
           <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Top Contribuidores (Vitórias)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {analytics.top_contributors && analytics.top_contributors.length > 0 ? (
                analytics.top_contributors.map((member: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold w-4 text-muted-foreground">{index + 1}</span>
                            <FramedAvatar userId={member.user_id} avatarUrl={member.avatar_url} sizeClassName="h-6 w-6" />
                            <span className="text-sm font-medium truncate max-w-[100px]">{member.username}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{member.wins}</span>
                    </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                    Nenhum membro pontuou ainda.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <div className="grid grid-cols-1 gap-4">
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Baixa Frequência
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {analytics.member_stats && analytics.member_stats.filter((m: any) => m.tournaments_played < 3).length > 0 ? (
                        analytics.member_stats
                            .filter((m: any) => m.tournaments_played < 3)
                            .sort((a: any, b: any) => a.tournaments_played - b.tournaments_played)
                            .slice(0, 5)
                            .map((member: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-yellow-500/5 p-2 rounded border border-yellow-500/10">
                                    <div className="flex items-center gap-2">
                                        <FramedAvatar userId={member.user_id} avatarUrl={member.avatar_url} sizeClassName="h-6 w-6" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{member.username}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {member.tournaments_played === 0 ? "Nunca jogou" : `${member.tournaments_played} torneio(s)`}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-yellow-600">
                                        {member.tournaments_played === 0 ? "Inativo" : "Baixa Freq."}
                                    </span>
                                </div>
                            ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Todos os membros são ativos!</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                        Baixo Rendimento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                     {analytics.member_stats && analytics.member_stats.filter((m: any) => m.tournaments_played >= 3 && m.avg_wins < 1.0).length > 0 ? (
                        analytics.member_stats
                            .filter((m: any) => m.tournaments_played >= 3 && m.avg_wins < 1.0)
                            .sort((a: any, b: any) => a.avg_wins - b.avg_wins)
                            .slice(0, 5)
                            .map((member: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-red-500/5 p-2 rounded border border-red-500/10">
                                    <div className="flex items-center gap-2">
                                        <FramedAvatar userId={member.user_id} avatarUrl={member.avatar_url} sizeClassName="h-6 w-6" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{member.username}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {member.avg_wins} vitórias/torneio
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-red-600">
                                        {member.total_wins}V em {member.tournaments_played}T
                                    </span>
                                </div>
                            ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhum membro com rendimento crítico.</p>
                    )}
                </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};