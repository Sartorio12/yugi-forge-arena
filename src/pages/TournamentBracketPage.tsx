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

  const PlayerSlot = ({ player, isWinner, isPlaceholder, hasBye, isWO, align = "left" }: { player: any, isWinner: boolean, isPlaceholder?: boolean, hasBye?: boolean, isWO?: boolean, align?: "left" | "right" }) => {
    const teamName = player?.id ? teamMap[player.id] : null;
    const teamLogo = teamName ? getTeamLogoUrl(teamName) : null;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 transition-all h-[44px] ${isWinner ? 'bg-yellow-500/20' : 'bg-black/60'} ${isPlaceholder ? 'opacity-40' : ''} ${align === "right" ? "flex-row-reverse" : ""}`}>
        {teamLogo && (
          <img src={teamLogo} alt={teamName || ""} className="h-6 w-6 object-contain shrink-0 brightness-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
        )}
        <FramedAvatar 
          userId={player?.id}
          username={player?.username}
          avatarUrl={player?.avatar_url}
          frameUrl={player?.equipped_frame_url}
          sizeClassName="h-6 w-6 shrink-0"
        />
        <div className={`flex flex-col min-w-0 flex-1 ${align === "right" ? "items-end" : ""}`}>
          <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
            <span className={`text-[11px] font-black truncate uppercase tracking-tighter ${isWinner ? 'text-yellow-500' : 'text-foreground'}`}>
              {player?.username || (isPlaceholder ? "Aguardando..." : "BYE")}
            </span>
            {hasBye && (
              <span className="text-[7px] bg-primary/20 text-primary px-1 rounded font-black border border-primary/30">BYE</span>
            )}
          </div>
          {player?.clan_members?.[0]?.clans?.tag && (
            <span className="text-[8px] text-muted-foreground leading-none font-bold">[{player.clan_members[0].clans.tag}]</span>
          )}
        </div>
        {isWinner && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
      </div>
    );
  };

  const RoundColumn = ({ roundNum, side }: { roundNum: number, side: "left" | "right" }) => {
    const roundMatches = rounds[roundNum] || [];
    const sideMatches = roundMatches.filter((_, idx) => {
        if (roundNum === maxRound) return false; // Final handles separately
        return side === "left" ? idx < roundMatches.length / 2 : idx >= roundMatches.length / 2;
    });

    if (sideMatches.length === 0) return null;

    return (
      <div className="flex flex-col w-64 gap-8 justify-around py-10">
        <div className="text-center mb-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black tracking-widest uppercase text-[10px] py-1 px-4">
                {roundMatches[0]?.round_name}
            </Badge>
        </div>
        {sideMatches.map((match) => (
          <Card key={match.id} className={`group relative z-10 border-0 bg-zinc-900/90 backdrop-blur-sm shadow-2xl overflow-hidden min-w-[200px] transition-transform hover:scale-105 duration-300 ${match.winner_id ? 'ring-1 ring-yellow-500/50' : 'ring-1 ring-white/10'}`}>
            <div className="flex flex-col divide-y divide-white/5">
              <PlayerSlot 
                player={match.player1} 
                isWinner={match.winner_id === match.player1_id && !!match.player1_id}
                isPlaceholder={!match.player1_id}
                align={side}
              />
              <PlayerSlot 
                player={match.player2} 
                isWinner={match.winner_id === match.player2_id && !!match.player2_id}
                isPlaceholder={!match.player2_id}
                align={side}
              />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-16 text-center">
          <Link to={`/tournaments/${id}`} className="mb-6">
            <Button variant="ghost" className="hover:text-primary transition-colors text-xs uppercase font-black tracking-widest">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
            </Button>
          </Link>
          <div className="relative inline-block">
             <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full opacity-50" />
             <h1 className="relative text-5xl font-black uppercase tracking-tighter italic flex items-center gap-4 text-white drop-shadow-2xl">
                <Trophy className="h-12 w-12 text-yellow-500 animate-pulse" />
                Champions League
             </h1>
          </div>
          <p className="text-primary text-sm font-black uppercase tracking-[0.3em] mt-2 opacity-80">{tournament?.title}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (matches && sortedRoundNumbers.length > 0) ? (
          <div className="flex justify-center items-center gap-12 overflow-x-auto pb-20 custom-scrollbar min-w-max">
            
            {/* LADO ESQUERDO */}
            <div className="flex gap-12 items-stretch">
                {sortedRoundNumbers.slice(0, -1).map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="left" />
                ))}
            </div>

            {/* CENTRO (FINAL) */}
            <div className="flex flex-col items-center gap-12 z-20">
                <div className="relative group">
                    <div className="absolute -inset-8 bg-yellow-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img src="/og.png" className="w-48 opacity-20 grayscale brightness-200" alt="" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="h-24 w-24 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    </div>
                </div>

                {rounds[maxRound]?.map((match) => (
                  <div key={match.id} className="flex flex-col items-center gap-4">
                     <Badge className="bg-yellow-500 text-black font-black uppercase tracking-[0.2em] px-6 py-1 italic animate-bounce">GRANDE FINAL</Badge>
                     <Card className="w-80 border-0 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[0_0_50px_rgba(0,0,0,1)] ring-2 ring-yellow-500/30 overflow-hidden">
                        <div className="flex flex-col divide-y divide-white/10">
                            <PlayerSlot 
                                player={match.player1} 
                                isWinner={match.winner_id === match.player1_id && !!match.player1_id}
                                isPlaceholder={!match.player1_id}
                            />
                            <PlayerSlot 
                                player={match.player2} 
                                isWinner={match.winner_id === match.player2_id && !!match.player2_id}
                                isPlaceholder={!match.player2_id}
                            />
                        </div>
                     </Card>
                     {match.winner_id && (
                        <div className="mt-4 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
                             <div className="text-yellow-500 font-black uppercase tracking-widest text-xl italic mb-2">CAMPEÃO</div>
                             <FramedAvatar 
                                userId={match.winner_id} 
                                username={match.winner_id === match.player1_id ? match.player1?.username : match.player2?.username}
                                avatarUrl={match.winner_id === match.player1_id ? match.player1?.avatar_url : match.player2?.avatar_url}
                                sizeClassName="h-20 w-20 ring-4 ring-yellow-500 shadow-yellow-500/50 shadow-2xl"
                             />
                        </div>
                     )}
                  </div>
                ))}
            </div>

            {/* LADO DIREITO */}
            <div className="flex flex-row-reverse gap-12 items-stretch">
                {sortedRoundNumbers.slice(0, -1).map((roundNum) => (
                    <RoundColumn key={roundNum} roundNum={roundNum} side="right" />
                ))}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/5 border-2 border-dashed rounded-xl border-white/10">
            <Trophy className="h-16 w-16 text-muted-foreground opacity-10" />
            <h3 className="text-xl font-bold uppercase tracking-tighter">Árvore em construção</h3>
            <p className="text-muted-foreground text-sm">O chaveamento será exibido assim que o organizador gerar as partidas.</p>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default TournamentBracketPage;