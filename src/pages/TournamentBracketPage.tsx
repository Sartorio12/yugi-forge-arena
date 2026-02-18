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
  const maxRound = sortedRoundNumbers.length > 0 ? Math.max(...sortedRoundNumbers) : 0;

  // Altura fixa para cálculos de alinhamento
  const MATCH_HEIGHT = 90;
  const INITIAL_GAP = 40;

  const PlayerSlot = ({ player, isWinner, isPlaceholder, hasBye, isWO, align = "left" }: { player: any, isWinner: boolean, isPlaceholder?: boolean, hasBye?: boolean, isWO?: boolean, align?: "left" | "right" }) => {
    const teamName = player?.id ? teamMap[player.id] : null;
    const teamLogo = teamName ? getTeamLogoUrl(teamName) : null;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 transition-all h-[40px] ${isWinner ? 'bg-yellow-500/20' : 'bg-black/60'} ${isPlaceholder ? 'opacity-40' : ''} ${align === "right" ? "flex-row-reverse" : ""}`}>
        {teamLogo && (
          <img src={teamLogo} alt={teamName || ""} className="h-5 w-5 object-contain shrink-0 brightness-110" />
        )}
        <div className={`flex flex-col min-w-0 flex-1 ${align === "right" ? "items-end" : ""}`}>
          <div className={`flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
            <span className={`text-[10px] font-black truncate uppercase tracking-tighter ${isWinner ? 'text-yellow-500' : 'text-foreground'}`}>
              {player?.username || (isPlaceholder ? "Aguardando..." : "BYE")}
            </span>
          </div>
        </div>
        {isWinner && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
      </div>
    );
  };

  const RoundColumn = ({ roundNum, side }: { roundNum: number, side: "left" | "right" }) => {
    const roundMatches = rounds[roundNum] || [];
    const sideMatches = roundMatches.filter((_, idx) => {
        if (roundNum === maxRound) return false;
        return side === "left" ? idx < roundMatches.length / 2 : idx >= roundMatches.length / 2;
    });

    if (sideMatches.length === 0) return null;

    // Cálculo de espaçamento para alinhar com a rodada anterior
    const roundIndex = sortedRoundNumbers.indexOf(roundNum);
    const multiplier = Math.pow(2, roundIndex);
    const gap = (multiplier - 1) * MATCH_HEIGHT + multiplier * INITIAL_GAP;
    const marginTop = (multiplier - 1) * (MATCH_HEIGHT / 2);

    return (
      <div className="flex flex-col w-60 relative" style={{ gap: `${gap}px`, marginTop: `${marginTop}px` }}>
        <div className="absolute -top-10 left-0 right-0 text-center">
            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{roundMatches[0]?.round_name}</span>
        </div>
        {sideMatches.map((match, idx) => (
          <div key={match.id} className="relative">
            <Card className={`group relative z-10 border-0 bg-zinc-900/90 shadow-2xl overflow-hidden transition-transform hover:scale-105 duration-300 ${match.winner_id ? 'ring-1 ring-yellow-500/50' : 'ring-1 ring-white/10'}`}>
                <div className="flex flex-col divide-y divide-white/5">
                <PlayerSlot player={match.player1} isWinner={match.winner_id === match.player1_id && !!match.player1_id} isPlaceholder={!match.player1_id} align={side} />
                <PlayerSlot player={match.player2} isWinner={match.winner_id === match.player2_id && !!match.player2_id} isPlaceholder={!match.player2_id} align={side} />
                </div>
            </Card>

            {/* Linhas Conectoras */}
            {roundNum < maxRound - 1 && (
                <div 
                    className={`absolute top-1/2 w-8 h-[2px] bg-white/10 ${side === "left" ? "-right-8" : "-left-8"}`}
                />
            )}
            {roundNum < maxRound - 1 && idx % 2 === 0 && (
                <div 
                    className={`absolute w-[2px] bg-white/10 ${side === "left" ? "-right-8" : "-left-8"}`}
                    style={{ 
                        height: `${gap + MATCH_HEIGHT}px`,
                        top: '50%'
                    }}
                />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12 overflow-x-auto custom-scrollbar">
        <div className="flex flex-col items-center mb-20">
          <Link to={`/tournaments/${id}`} className="mb-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground uppercase font-black tracking-widest text-[10px]">
              <ArrowLeft className="mr-2 h-3 w-3" /> Voltar
            </Button>
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-center drop-shadow-glow">
             Chaveamento <span className="text-primary">Elite</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">{tournament?.title}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (matches && sortedRoundNumbers.length > 0) ? (
          <div className="flex justify-center items-start gap-16 min-w-max pb-20">
            
            {/* BLOCO ESQUERDO */}
            <div className="flex gap-16">
                {sortedRoundNumbers.slice(0, -1).map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="left" />
                ))}
            </div>

            {/* CENTRO (FINAL) */}
            <div className="flex flex-col items-center pt-20">
                <div className="relative mb-12">
                    <div className="absolute -inset-10 bg-yellow-500/20 blur-3xl rounded-full" />
                    <Trophy className="h-24 w-24 text-yellow-500 relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                </div>

                {rounds[maxRound]?.map((match) => (
                    <div key={match.id} className="flex flex-col items-center gap-6">
                        <Badge className="bg-yellow-500 text-black font-black uppercase italic tracking-widest px-8">A Grande Final</Badge>
                        <Card className="w-72 border-0 bg-zinc-900 shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-2 ring-yellow-500/40">
                            <div className="flex flex-col divide-y divide-white/5">
                                <PlayerSlot player={match.player1} isWinner={match.winner_id === match.player1_id && !!match.player1_id} isPlaceholder={!match.player1_id} />
                                <PlayerSlot player={match.player2} isWinner={match.winner_id === match.player2_id && !!match.player2_id} isPlaceholder={!match.player2_id} />
                            </div>
                        </Card>
                        
                        {match.winner_id && (
                            <div className="flex flex-col items-center animate-bounce mt-4">
                                <span className="text-yellow-500 font-black text-xl italic tracking-tighter uppercase mb-2">Campeão</span>
                                <FramedAvatar 
                                    userId={match.winner_id} 
                                    username={match.winner_id === match.player1_id ? match.player1?.username : match.player2?.username}
                                    avatarUrl={match.winner_id === match.player1_id ? match.player1?.avatar_url : match.player2?.avatar_url}
                                    sizeClassName="h-24 w-24 ring-4 ring-yellow-500 shadow-2xl"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* BLOCO DIREITO */}
            <div className="flex flex-row-reverse gap-16">
                {sortedRoundNumbers.slice(0, -1).map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="right" />
                ))}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/5 border-2 border-dashed rounded-xl border-white/10">
            <Trophy className="h-16 w-16 text-muted-foreground opacity-10" />
            <h3 className="text-xl font-bold uppercase tracking-tighter">Árvore em construção</h3>
          </div>
        )}
      </main>

      <style>{`
        .drop-shadow-glow { filter: drop-shadow(0 0 10px rgba(var(--primary), 0.5)); }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TournamentBracketPage;