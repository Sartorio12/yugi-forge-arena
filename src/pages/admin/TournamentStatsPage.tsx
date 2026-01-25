import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PieChart as PieChartIcon, Info } from "lucide-react";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const TournamentStatsPage = () => {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-list-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["tournament-archetype-stats", selectedTournamentId],
    queryFn: async () => {
      if (!selectedTournamentId) return [];
      const { data, error } = await supabase.rpc("get_tournament_archetype_stats", {
        p_tournament_id: Number(selectedTournamentId)
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournamentId,
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PieChartIcon className="h-8 w-8 text-primary" />
            Estatísticas de Metagame
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Evento</CardTitle>
            <CardDescription>
              Escolha um torneio para analisar a distribuição de arquétipos baseada nos decks enviados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecione um torneio..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTournamentId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Column */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribuição por Arquétipo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : stats && stats.length > 0 ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="archetype_name" 
                          type="category" 
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Presença']}
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                          {stats.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Info className="h-8 w-8" />
                    <p>Nenhum dado de arquétipo encontrado para este torneio.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* List Column */}
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Popularidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.map((stat: any, index: number) => (
                    <div key={stat.archetype_name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{stat.archetype_name}</span>
                        <span className="text-xs text-muted-foreground">{stat.deck_count} Jogadores</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">{stat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentStatsPage;
