import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { getTeamLogoUrl } from "@/constants/teams";

interface Match {
  id: number;
  round_number: number;
  round_name: string;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  is_wo: boolean;
  player1?: { id: string; username: string; avatar_url: string | null; equipped_frame_url: string | null; clan_members?: { clans: { tag: string } }[] };
  player2?: { id: string; username: string; avatar_url: string | null; equipped_frame_url: string | null; clan_members?: { clans: { tag: string } }[] };
}

interface BracketPageProps {
  user: User | null;
  onLogout: () => void;
}

const TournamentBracketPage = ({ user, onLogout }: BracketPageProps) => {
  const { id } = useParams<{ id: string }>();

  const { data: tournament } = useQuery({
    queryKey: ["tournament_basic_bracket", id],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("title, status").eq("id", Number(id)).single();
      return data;
    }
  });

  const { data: participants } = useQuery({
    queryKey: ["tournament_participants_teams", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("user_id, team_selection")
        .eq("tournament_id", Number(id));
      return data;
    },
    enabled: !!id
  });

  const teamMap = participants?.reduce((acc: Record<string, string>, p) => {
    if (p.user_id && p.team_selection) acc[p.user_id] = p.team_selection;
    return acc;
  }, {}) || {};

  const { data: matches, isLoading } = useQuery({
    queryKey: ["tournament_bracket_matches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          id,
          round_number,
          round_name,
          match_number,
          player1_id,
          player2_id,
          winner_id,
          is_wo,
          player1:player1_id(id, username, avatar_url, equipped_frame_url, clan_members(clans(tag))),
          player2:player2_id(id, username, avatar_url, equipped_frame_url, clan_members(clans(tag)))
        `)
        .eq("tournament_id", Number(id))
        .gt("round_number", 0)
        .order("round_number", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      return data as any as Match[];
    },
    enabled: !!id,
  });

  const rounds = matches?.reduce((acc: Record<number, Match[]>, match) => {
    if (match.round_number && !acc[match.round_number]) acc[match.round_number] = [];
    if (match.round_number) acc[match.round_number].push(match);
    return acc;
  }, {});

  const sortedRoundNumbers = rounds ? Object.keys(rounds).map(Number).sort((a, b) => a - b) : [];
  
  // Se houver apenas 1 rodada no banco, tratamos de forma especial
  const isOnlyOneRound = sortedRoundNumbers.length === 1;
  const maxRoundNum = sortedRoundNumbers.length > 0 ? Math.max(...sortedRoundNumbers) : 0;

  const PlayerSlot = ({ player, isWinner, isPlaceholder, hasBye, align = "left" }: { player: any, isWinner: boolean, isPlaceholder?: boolean, hasBye?: boolean, align?: "left" | "right" }) => {
    const teamName = player?.id ? teamMap[player.id] : null;
    const teamLogo = teamName ? getTeamLogoUrl(teamName) : null;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 transition-all h-[40px] ${isWinner ? 'bg-yellow-500/20' : 'bg-black/60'} ${isPlaceholder ? 'opacity-40' : ''} ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
        {teamLogo && (
          <img src={teamLogo} alt={teamName || ""} className="h-6 w-6 object-contain shrink-0 brightness-110" />
        )}
        <div className={`flex flex-col min-w-0 flex-1 overflow-hidden`}>
          <span className={`text-[10px] font-black truncate uppercase tracking-tighter ${isWinner ? 'text-yellow-500' : 'text-foreground'}`}>
            {player?.username || (isPlaceholder ? "Aguardando..." : "BYE")}
          </span>
        </div>
        {isWinner && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
      </div>
    );
  };

  const RoundColumn = ({ roundNum, side }: { roundNum: number, side: "left" | "right" }) => {
    const roundMatches = rounds[roundNum] || [];
    
    // Se for a única rodada, dividimos ela
    // Se não, dividimos se não for a final
    const matchesToDisplay = roundMatches.filter((_, idx) => {
        if (!isOnlyOneRound && roundNum === maxRoundNum && roundMatches.length === 1) return false;
        return side === "left" ? idx < roundMatches.length / 2 : idx >= roundMatches.length / 2;
    });

    if (matchesToDisplay.length === 0) return null;

    return (
      <div className="flex flex-col w-64 gap-12 py-10">
        <div className="text-center">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black tracking-widest uppercase text-[10px] py-1 px-4">
                {roundMatches[0]?.round_name}
            </Badge>
        </div>
        <div className="flex flex-col justify-around gap-6 flex-1">
            {matchesToDisplay.map((match) => (
                <Card key={match.id} className={`group relative z-10 border-0 bg-zinc-900/90 shadow-2xl overflow-hidden transition-transform hover:scale-105 duration-300 ${match.winner_id ? 'ring-1 ring-yellow-500/50' : 'ring-1 ring-white/10'}`}>
                    <div className="flex flex-col divide-y divide-white/5">
                        <PlayerSlot player={match.player1} isWinner={match.winner_id === match.player1_id && !!match.player1_id} isPlaceholder={!match.player1_id} align={side} />
                        <PlayerSlot player={match.player2} isWinner={match.winner_id === match.player2_id && !!match.player2_id} isPlaceholder={!match.player2_id} align={side} />
                    </div>
                </Card>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-16 text-center">
          <Link to={`/tournaments/${id}`} className="mb-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground uppercase font-black tracking-widest text-[10px]">
              <ArrowLeft className="mr-2 h-3 w-3" /> Voltar
            </Button>
          </Link>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic text-center text-white">
             {tournament?.title}
          </h1>
          <Badge className="bg-primary text-black mt-2 font-black tracking-widest">CHAVEAMENTO LIGA</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (matches && sortedRoundNumbers.length > 0) ? (
          <div className="flex flex-row justify-center items-center gap-8 md:gap-20 overflow-x-auto pb-20 custom-scrollbar">
            
            {/* BLOCO ESQUERDO (4 Confrontos se for oitavas) */}
            <div className="flex flex-row gap-8">
                {sortedRoundNumbers.map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="left" />
                ))}
            </div>

            {/* CENTRO (FINALISTA / TROFÉU) */}
            <div className="flex flex-col items-center justify-center min-w-[300px] py-10">
                <div className="relative mb-8">
                    <div className="absolute -inset-10 bg-yellow-500/10 blur-3xl rounded-full" />
                    <Trophy className="h-32 w-32 text-yellow-500 relative z-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]" />
                </div>

                {!isOnlyOneRound && rounds[maxRoundNum]?.length === 1 && (
                    <div className="flex flex-col items-center gap-4">
                         <Badge className="bg-yellow-500 text-black font-black uppercase italic tracking-widest px-8">A Grande Final</Badge>
                         <Card className="w-72 border-0 bg-zinc-900 shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-2 ring-yellow-500/40">
                            <div className="flex flex-col divide-y divide-white/5">
                                <PlayerSlot player={rounds[maxRoundNum][0].player1} isWinner={rounds[maxRoundNum][0].winner_id === rounds[maxRoundNum][0].player1_id && !!rounds[maxRoundNum][0].player1_id} isPlaceholder={!rounds[maxRoundNum][0].player1_id} />
                                <PlayerSlot player={rounds[maxRoundNum][0].player2} isWinner={rounds[maxRoundNum][0].winner_id === rounds[maxRoundNum][0].player2_id && !!rounds[maxRoundNum][0].player2_id} isPlaceholder={!rounds[maxRoundNum][0].player2_id} />
                            </div>
                         </Card>
                    </div>
                )}
                
                {isOnlyOneRound && (
                    <div className="text-center space-y-2 opacity-50">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Próximas Fases</p>
                        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent mx-auto" />
                    </div>
                )}
            </div>

            {/* BLOCO DIREITO (4 Confrontos se for oitavas) */}
            <div className="flex flex-row-reverse gap-8">
                {sortedRoundNumbers.map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="right" />
                ))}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/5 border-2 border-dashed rounded-xl border-white/10">
            <Trophy className="h-16 w-16 text-muted-foreground opacity-10" />
            <h3 className="text-xl font-bold uppercase tracking-tighter italic">Nenhum confronto gerado</h3>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">As chaves aparecerão aqui em breve.</p>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TournamentBracketPage;