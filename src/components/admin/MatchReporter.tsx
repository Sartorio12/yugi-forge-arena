import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Swords, Trophy, AlertTriangle, RefreshCcw, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FramedAvatar } from "@/components/FramedAvatar";

interface MatchReporterProps {
  tournamentId: string;
}

export const MatchReporter = ({ tournamentId }: MatchReporterProps) => {
  const queryClient = useQueryClient();
  const [player1, setPlayer1] = useState<string>("");
  const [player2, setPlayer2] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [roundName, setRoundName] = useState<string>("");
  const [isWO, setIsWO] = useState<boolean>(false);
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [isTiebreaker, setIsTiebreaker] = useState<boolean>(false);
  
  // State to track existing match if found
  const [existingMatchId, setExistingMatchId] = useState<number | null>(null);

  // Fetch participants
  const { data: participants, isLoading } = useQuery({
    queryKey: ["tournament-participants", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select(`
          user_id, 
          group_name, 
          profiles (
            username, 
            avatar_url,
            equipped_frame_url,
            clan_members (
              clans (
                tag
              )
            )
          )
        `)
        .eq("tournament_id", Number(tournamentId));

      if (error) throw error;
      return data;
    },
  });

  // Check for existing match when players are selected
  useEffect(() => {
    const checkExistingMatch = async () => {
        if (player1 && player2) {
            const { data } = await supabase
                .from("tournament_matches")
                .select("*")
                .eq("tournament_id", Number(tournamentId))
                .or(`and(player1_id.eq.${player1},player2_id.eq.${player2}),and(player1_id.eq.${player2},player2_id.eq.${player1})`)
                .maybeSingle();
            
            if (data) {
                setExistingMatchId(data.id);
                setRoundName(data.round_name || "");
                if (data.winner_id) setWinner(data.winner_id);
                if (data.is_wo) setIsWO(data.is_wo);
                if ((data as any).is_tiebreaker) setIsTiebreaker((data as any).is_tiebreaker);
                if (data.player1_score !== null) setScore1(data.player1_id === player1 ? data.player1_score : data.player2_score);
                if (data.player2_score !== null) setScore2(data.player1_id === player1 ? data.player2_score : data.player1_score);
            } else {
                setExistingMatchId(null);
                setRoundName("");
                setWinner("");
                setIsWO(false);
                setIsTiebreaker(false);
                setScore1(0);
                setScore2(0);
            }
        }
    };
    checkExistingMatch();
  }, [player1, player2, tournamentId]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!player1 || !player2 || !winner) throw new Error("Preencha todos os campos obrigatórios.");
      if (player1 === player2) throw new Error("Os jogadores devem ser diferentes.");

      // Ensure scores align with player selection logic (P1 is always the one selected in first dropdown)
      // BUT existing match might have them swapped.
      // We need to map UI score1 to database player1_score correctly.
      
      let p1_score_db = score1;
      let p2_score_db = score2;
      let p1_id_db = player1;
      let p2_id_db = player2;

      // If updating, respect existing match slot order
      if (existingMatchId) {
          const { data: currentMatch } = await supabase.from("tournament_matches").select("player1_id, player2_id").eq("id", existingMatchId).single();
          if (currentMatch) {
              if (currentMatch.player1_id === player1) {
                  // UI P1 matches DB P1
                  p1_score_db = score1;
                  p2_score_db = score2;
              } else {
                  // UI P1 is actually DB P2
                  p1_score_db = score2;
                  p2_score_db = score1;
              }
              p1_id_db = currentMatch.player1_id!; // Keep original IDs
              p2_id_db = currentMatch.player2_id!;
          }
      }

      // If WO is checked, enforce 2-0 score if not set
      if (isWO) {
         if (winner === player1) { p1_score_db = 2; p2_score_db = 0; }
         else { p1_score_db = 0; p2_score_db = 2; }
      }

      if (existingMatchId) {
          // UPDATE
          const { error } = await supabase
            .from("tournament_matches")
            .update({
              winner_id: winner,
              is_wo: isWO,
              is_tiebreaker: isTiebreaker,
              player1_score: p1_score_db,
              player2_score: p2_score_db,
              // round_name: roundName -- Don't overwrite round name for existing structure usually
            } as any)
            .eq("id", existingMatchId);
           if (error) throw error;
      } else {
          // INSERT
          const { error } = await supabase
            .from("tournament_matches")
            .insert({
              tournament_id: Number(tournamentId),
              player1_id: p1_id_db,
              player2_id: p2_id_db,
              winner_id: winner,
              round_name: isTiebreaker ? "Desempate (MD1)" : (roundName || "Rodada Regular"),
              is_wo: isWO,
              is_tiebreaker: isTiebreaker,
              player1_score: p1_score_db,
              player2_score: p2_score_db
            } as any);
           if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: existingMatchId ? "Resultado atualizado!" : "Partida registrada!" });
      // Don't clear players immediately to allow checking
      setWinner("");
      setIsWO(false);
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipantsManagement", tournamentId] });
    },
    onError: (err) => {
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <Card className="border-primary/30 bg-black/60 shadow-2xl backdrop-blur-sm overflow-hidden">
      <div className="bg-primary/10 px-6 py-4 border-b border-primary/20 flex items-center justify-between">
        <div>
            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-primary">
              <Swords className="h-6 w-6" /> 
              {existingMatchId ? "Atualizar Resultado" : "Novo Confronto"}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-bold text-xs uppercase tracking-widest">
                Gerenciamento de Resultados MD3
            </CardDescription>
        </div>
        {existingMatchId && (
            <Badge className="bg-green-500 text-black font-black animate-pulse px-3 py-1">
                PARTIDA #{existingMatchId} ENCONTRADA
            </Badge>
        )}
      </div>

      <CardContent className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            {/* Player 1 Selection */}
            <div className={`space-y-4 p-6 rounded-2xl border-2 transition-all duration-500 ${player1 ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                <label className="text-xs font-black uppercase text-primary/60 tracking-widest block text-center">Duelista 1</label>
                <Select value={player1} onValueChange={(val) => { setPlayer1(val); setWinner(""); }}>
                <SelectTrigger className="h-14 text-xl font-bold border-0 bg-transparent focus:ring-0 text-center">
                    <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-primary/20">
                    {participants?.sort((a,b) => (a.group_name || "").localeCompare(b.group_name || ""))?.map((p) => {
                       const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                       const clanMembers = profile?.clan_members;
                       const tag = Array.isArray(clanMembers) ? clanMembers[0]?.clans?.tag : (clanMembers as any)?.clans?.tag;
                       const group = p.group_name ? `[${p.group_name}] ` : "";
                       return (
                        <SelectItem key={p.user_id} value={p.user_id} className="text-lg py-3 focus:bg-primary/20">
                            <span className="text-primary/50 font-black mr-2">{group}</span>
                            <span className="font-bold">{tag ? `[${tag}] ` : ""}{profile?.username}</span>
                        </SelectItem>
                       );
                    })}
                </SelectContent>
                </Select>
                {player1 && (() => {
                    const participant = participants?.find(p => p.user_id === player1);
                    const profile = Array.isArray(participant?.profiles) ? participant?.profiles[0] : participant?.profiles;
                    return (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300">
                             <FramedAvatar 
                                userId={player1} 
                                username={profile?.username} 
                                avatarUrl={profile?.avatar_url}
                                frameUrl={profile?.equipped_frame_url}
                                sizeClassName="h-20 w-20 shadow-2xl" 
                            />
                        </div>
                    );
                })()}
            </div>

            <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-black italic">VS</div>
            </div>

            {/* Player 2 Selection */}
            <div className={`space-y-4 p-6 rounded-2xl border-2 transition-all duration-500 ${player2 ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                <label className="text-xs font-black uppercase text-primary/60 tracking-widest block text-center">Duelista 2</label>
                <Select value={player2} onValueChange={(val) => { setPlayer2(val); setWinner(""); }}>
                <SelectTrigger className="h-14 text-xl font-bold border-0 bg-transparent focus:ring-0 text-center">
                    <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-primary/20">
                    {participants?.filter(p => p.user_id !== player1)?.map((p) => {
                       const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                       const clanMembers = profile?.clan_members;
                       const tag = Array.isArray(clanMembers) ? clanMembers[0]?.clans?.tag : (clanMembers as any)?.clans?.tag;
                       const group = p.group_name ? `[${p.group_name}] ` : "";
                       return (
                        <SelectItem key={p.user_id} value={p.user_id} className="text-lg py-3 focus:bg-primary/20">
                            <span className="text-primary/50 font-black mr-2">{group}</span>
                            <span className="font-bold">{tag ? `[${tag}] ` : ""}{profile?.username}</span>
                        </SelectItem>
                       );
                    })}
                </SelectContent>
                </Select>
                {player2 && (() => {
                    const participant = participants?.find(p => p.user_id === player2);
                    const profile = Array.isArray(participant?.profiles) ? participant?.profiles[0] : participant?.profiles;
                    return (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300">
                            <FramedAvatar 
                                userId={player2} 
                                username={profile?.username} 
                                avatarUrl={profile?.avatar_url}
                                frameUrl={profile?.equipped_frame_url}
                                sizeClassName="h-20 w-20 shadow-2xl" 
                            />
                        </div>
                    );
                })()}
            </div>
        </div>

        {/* Score Inputs - CENTRAL FOCUS */}
        {player1 && player2 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col items-center gap-6 bg-primary/5 p-8 rounded-[2rem] border-2 border-primary/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    
                    <div className="flex items-center justify-center gap-12">
                        <div className="flex flex-col items-center gap-3">
                            <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Sets P1</Label>
                            <Input 
                                type="number" 
                                className="w-24 h-24 text-center text-6xl font-black bg-black/60 border-primary/30 focus:border-primary rounded-2xl shadow-inner transition-all hover:scale-105 focus:scale-110"
                                value={score1}
                                onChange={(e) => { setScore1(Number(e.target.value)); setIsWO(false); }}
                            />
                        </div>
                        
                        <div className="text-4xl font-black text-primary/40 italic">X</div>
                        
                        <div className="flex flex-col items-center gap-3">
                            <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Sets P2</Label>
                            <Input 
                                type="number" 
                                className="w-24 h-24 text-center text-6xl font-black bg-black/60 border-primary/30 focus:border-primary rounded-2xl shadow-inner transition-all hover:scale-105 focus:scale-110"
                                value={score2}
                                onChange={(e) => { setScore2(Number(e.target.value)); setIsWO(false); }}
                            />
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        <label className="text-xs font-black uppercase text-primary/60 block text-center tracking-[0.3em]">Determinar Vencedor</label>
                        <Select value={winner} onValueChange={setWinner} disabled={!player1 || !player2}>
                        <SelectTrigger className="h-16 text-2xl font-black uppercase italic bg-primary text-black border-0 hover:bg-primary/90 transition-all rounded-xl shadow-lg">
                            <SelectValue placeholder="VENCEDOR?" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-primary/40">
                            {player1 && participants?.find(p => p.user_id === player1) && (() => {
                                const p = participants.find(p => p.user_id === player1);
                                return <SelectItem value={player1} className="text-xl font-black py-4 uppercase italic">{p?.profiles?.username}</SelectItem>;
                            })()}
                            {player2 && participants?.find(p => p.user_id === player2) && (() => {
                                const p = participants.find(p => p.user_id === player2);
                                return <SelectItem value={player2} className="text-xl font-black py-4 uppercase italic">{p?.profiles?.username}</SelectItem>;
                            })()}
                        </SelectContent>
                        </Select>
                        
                        {/* Auto-set winner button helpers */}
                        <div className="flex justify-center gap-3">
                             <Button variant="secondary" size="sm" className="font-black text-[10px] h-8 px-4 border-b-2 border-primary/30" onClick={() => { setScore1(2); setScore2(0); setWinner(player1); }}>2-0 (P1)</Button>
                             <Button variant="secondary" size="sm" className="font-black text-[10px] h-8 px-4 border-b-2 border-primary/30" onClick={() => { setScore1(2); setScore2(1); setWinner(player1); }}>2-1 (P1)</Button>
                             <div className="w-px bg-white/10 mx-2"></div>
                             <Button variant="secondary" size="sm" className="font-black text-[10px] h-8 px-4 border-b-2 border-primary/30" onClick={() => { setScore1(1); setScore2(2); setWinner(player2); }}>1-2 (P2)</Button>
                             <Button variant="secondary" size="sm" className="font-black text-[10px] h-8 px-4 border-b-2 border-primary/30" onClick={() => { setScore1(0); setScore2(2); setWinner(player2); }}>0-2 (P2)</Button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4 bg-red-500/10 p-5 rounded-2xl border-2 border-red-500/20 transition-all hover:bg-red-500/20">
                    <Checkbox 
                        id="wo" 
                        checked={isWO} 
                        className="w-6 h-6 border-red-500 data-[state=checked]:bg-red-500"
                        onCheckedChange={(checked) => {
                            setIsWO(checked as boolean);
                            if (checked && winner) {
                                if (winner === player1) { setScore1(2); setScore2(0); }
                                else { setScore1(0); setScore2(2); }
                            }
                        }} 
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="wo" className="text-base font-black flex items-center gap-2 text-red-500 uppercase tracking-tighter">
                            <AlertTriangle className="h-5 w-5" /> Vitória por W.O. (Ausência)
                        </Label>
                        <p className="text-xs text-red-400 font-bold">
                            Marque apenas se o oponente não compareceu.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-4 bg-yellow-500/10 p-5 rounded-2xl border-2 border-yellow-500/20 transition-all hover:bg-yellow-500/20">
                    <Checkbox 
                        id="tiebreaker" 
                        checked={isTiebreaker} 
                        className="w-6 h-6 border-yellow-500 data-[state=checked]:bg-yellow-500"
                        onCheckedChange={(checked) => {
                            setIsTiebreaker(checked as boolean);
                            if (checked) {
                                // If tiebreaker (MD1), usually 1-0 or 0-1
                                if (winner === player1) { setScore1(1); setScore2(0); }
                                else if (winner === player2) { setScore1(0); setScore2(1); }
                            }
                        }} 
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="tiebreaker" className="text-base font-black flex items-center gap-2 text-yellow-500 uppercase tracking-tighter">
                            <Trophy className="h-5 w-5" /> Desempate (MD1)
                        </Label>
                        <p className="text-xs text-yellow-400 font-bold">
                            Marque se esta partida for um desempate oficial (não conta para saldo regular).
                        </p>
                    </div>
                </div>

                <Button 
                    className={`w-full h-20 text-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all border-b-8 active:border-b-0 ${existingMatchId ? 'bg-green-600 hover:bg-green-500 border-green-800' : 'bg-primary hover:bg-primary/90 border-yellow-700 text-black'}`} 
                    onClick={() => reportMutation.mutate()} 
                    disabled={reportMutation.isPending || !player1 || !player2 || !winner}
                >
                    {reportMutation.isPending ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <RefreshCcw className="mr-3 h-8 w-8" />}
                    {existingMatchId ? "CONFIRMAR ATUALIZAÇÃO" : "REGISTRAR VITÓRIA"}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

import { CheckCircle } from "lucide-react"; // Import missing icon
