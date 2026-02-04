import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Swords, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Progress } from "@/components/ui/progress";

interface TournamentPredictionsProps {
  tournamentId: number;
}

interface PlayerStats {
  user_id: string;
  username: string;
  avatar_url: string;
  power_score: number;
}

const COLORS = ["#facc15", "#a3a3a3", "#a16207", "#3b82f6", "#22c55e", "#ef4444"];

export const TournamentPredictions = ({ tournamentId }: TournamentPredictionsProps) => {
  const [simulatorPlayerA, setSimulatorPlayerA] = useState<string>("");
  const [simulatorPlayerB, setSimulatorPlayerB] = useState<string>("");

  // 1. Fetch Power Rankings
  const { data: rankings, isLoading: isLoadingRankings } = useQuery({
    queryKey: ["tournamentPredictions", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tournament_power_rankings", { p_tournament_id: tournamentId });
      if (error) throw error;
      return data as PlayerStats[];
    },
  });

  // 2. Fetch Simulation (Only if both selected)
  const { data: simulation, isLoading: isSimulating } = useQuery({
    queryKey: ["matchupSimulation", simulatorPlayerA, simulatorPlayerB],
    queryFn: async () => {
      if (!simulatorPlayerA || !simulatorPlayerB) return null;
      const { data, error } = await supabase.rpc("simulate_matchup", { 
        p_player_a: simulatorPlayerA, 
        p_player_b: simulatorPlayerB 
      });
      if (error) throw error;
      return data[0]; // RPC returns an array
    },
    enabled: !!simulatorPlayerA && !!simulatorPlayerB && simulatorPlayerA !== simulatorPlayerB
  });

  // Prepare Chart Data (Top 5 + Others)
  const chartData = rankings ? rankings.slice(0, 5).map(p => ({
    name: p.username,
    value: p.power_score
  })) : [];

  if (rankings && rankings.length > 5) {
      const othersScore = rankings.slice(5).reduce((acc, curr) => acc + curr.power_score, 0);
      chartData.push({ name: "Outros", value: othersScore });
  }

  // Calculate percentages for chart tooltip manually if needed, 
  // but Recharts handles value distribution.

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* SECTION 1: THE FAVORITES (CHART) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-background to-muted/20 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Termômetro do Título
                </CardTitle>
                <CardDescription>
                    Probabilidade baseada em desempenho atual, histórico e momento.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {isLoadingRankings ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [Math.round(value), "Power Score"]}
                                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground">Dados insuficientes para previsão.</div>
                )}
            </CardContent>
        </Card>

        {/* TOP CANDIDATE HIGHLIGHT */}
        <Card className="bg-yellow-500/10 border-yellow-500/50 flex flex-col justify-center items-center text-center">
            <CardHeader>
                <CardTitle className="text-yellow-600">Favorito Atual</CardTitle>
            </CardHeader>
            <CardContent>
                {rankings && rankings.length > 0 ? (
                    <div className="space-y-4">
                        <div className="mx-auto w-fit relative">
                            <div className="absolute -top-6 -right-6 text-4xl animate-bounce">👑</div>
                            <FramedAvatar 
                                userId={rankings[0].user_id}
                                avatarUrl={rankings[0].avatar_url}
                                username={rankings[0].username}
                                sizeClassName="h-24 w-24"
                            />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{rankings[0].username}</h3>
                            <p className="text-sm text-muted-foreground">Power Score: {Math.round(rankings[0].power_score)}</p>
                        </div>
                    </div>
                ) : (
                    <Loader2 className="animate-spin" />
                )}
            </CardContent>
        </Card>
      </div>

      {/* SECTION 2: MATCHUP SIMULATOR */}
      <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Swords className="h-6 w-6 text-blue-500" /> Oráculo de Duelos (Simulador)
              </CardTitle>
              <CardDescription>
                  Selecione dois jogadores para simular uma partida hipotética com base no histórico.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                  <Select value={simulatorPlayerA} onValueChange={setSimulatorPlayerA}>
                      <SelectTrigger className="w-full md:w-[250px]">
                          <SelectValue placeholder="Jogador A" />
                      </SelectTrigger>
                      <SelectContent>
                          {rankings?.map(p => (
                              <SelectItem key={p.user_id} value={p.user_id}>{p.username}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>

                  <div className="text-2xl font-black text-muted-foreground">VS</div>

                  <Select value={simulatorPlayerB} onValueChange={setSimulatorPlayerB}>
                      <SelectTrigger className="w-full md:w-[250px]">
                          <SelectValue placeholder="Jogador B" />
                      </SelectTrigger>
                      <SelectContent>
                          {rankings?.map(p => (
                              <SelectItem key={p.user_id} value={p.user_id}>{p.username}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {/* Simulation Result */}
              {isSimulating ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
              ) : simulation && simulatorPlayerA && simulatorPlayerB ? (
                  <div className="space-y-4 max-w-2xl mx-auto bg-muted/30 p-6 rounded-lg border">
                      <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-blue-400">{Math.round(simulation.a_win_probability)}% Chance</span>
                          <span className="text-red-400">{Math.round(simulation.b_win_probability)}% Chance</span>
                      </div>
                      <Progress value={simulation.a_win_probability} className="h-4 bg-red-900/20" />
                      
                      <div className="text-center text-xs text-muted-foreground mt-4">
                          Baseado em {simulation.total_matches} partidas diretas e histórico global.
                          {simulation.total_matches < 3 && (
                              <div className="flex items-center justify-center gap-1 text-yellow-500 mt-1">
                                  <AlertTriangle className="h-3 w-3" /> Amostra pequena, previsão baseada em stats globais.
                              </div>
                          )}
                      </div>
                  </div>
              ) : simulatorPlayerA && simulatorPlayerB && simulatorPlayerA === simulatorPlayerB ? (
                  <div className="text-center text-muted-foreground p-4">Selecione jogadores diferentes.</div>
              ) : (
                  <div className="text-center text-muted-foreground p-4 opacity-50">Aguardando seleção...</div>
              )}
          </CardContent>
      </Card>

    </div>
  );
};
