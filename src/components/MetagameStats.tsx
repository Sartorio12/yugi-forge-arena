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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PieChart as PieChartIcon, Info } from "lucide-react";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface MetagameStatsProps {
  tournamentId: number;
}

export const MetagameStats = ({ tournamentId }: MetagameStatsProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["tournament-archetype-stats-news", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tournament_archetype_stats", {
        p_tournament_id: tournamentId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg">
        <Info className="h-6 w-6 mb-2" />
        <p className="text-sm text-center">Estatísticas de metagame ainda não disponíveis para este torneio.</p>
      </div>
    );
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <PieChartIcon className="text-primary h-6 w-6" />
        Distribuição do Metagame
      </h2>
      <Card className="bg-card/50 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ranking de Arquétipos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Chart */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#333" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="archetype_name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 11, fill: '#aaa' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Presença']}
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {stats.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List */}
            <div className="space-y-3">
              {stats.slice(0, 6).map((stat: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-background/40 border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-medium">{stat.archetype_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{stat.percentage}%</span>
                  </div>
                </div>
              ))}
              {stats.length > 6 && (
                  <p className="text-xs text-center text-muted-foreground pt-2 italic">
                    + {stats.length - 6} outros arquétipos participantes
                  </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
