import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Match {
  id: number;
  round_number: number;
  round_name: string;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
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
          player1:player1_id(id, username, avatar_url, equipped_frame_url, clan_members(clans(tag))),
          player2:player2_id(username, avatar_url, equipped_frame_url, clan_members(clans(tag)))
        `)
        .eq("tournament_id", Number(id))
        .order("round_number", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      return data as any as Match[];
    },
    enabled: !!id,
  });

  const rounds = matches?.reduce((acc: Record<number, Match[]>, match) => {
    if (!acc[match.round_number]) acc[match.round_number] = [];
    acc[match.round_number].push(match);
    return acc;
  }, {});

  const sortedRoundNumbers = rounds ? Object.keys(rounds).map(Number).sort((a, b) => a - b) : [];

  // Calculate dynamic height based on the number of matches in Round 1
  const matchesInRound1 = sortedRoundNumbers.length > 0 ? rounds[sortedRoundNumbers[0]].length : 0;
  const containerHeight = Math.max(600, matchesInRound1 * 130); // 130px per match in R1

  const PlayerSlot = ({ player, isWinner, isPlaceholder }: { player: any, isWinner: boolean, isPlaceholder?: boolean }) => (
    <div className={`flex items-center gap-2 px-3 py-2 transition-all h-[40px] ${isWinner ? 'bg-yellow-500/20' : 'bg-black/40'} ${isPlaceholder ? 'opacity-40' : ''}`}>
      <FramedAvatar 
        userId={player?.id}
        username={player?.username}
        avatarUrl={player?.avatar_url}
        frameUrl={player?.equipped_frame_url}
        sizeClassName="h-6 w-6 shrink-0"
      />
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-[11px] font-bold truncate ${isWinner ? 'text-yellow-500' : 'text-foreground'}`}>
          {player?.username || (isPlaceholder ? "Aguardando..." : "BYE")}
        </span>
        {player?.clan_members?.[0]?.clans?.tag && (
          <span className="text-[8px] text-muted-foreground leading-none">[{player.clan_members[0].clans.tag}]</span>
        )}
      </div>
      {isWinner && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-4 mb-12">
          <Link to={`/tournaments/${id}`}>
            <Button variant="ghost" className="hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Chaveamento Elite
            </h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{tournament?.title}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : rounds && sortedRoundNumbers.length > 0 ? (
          <div className="flex items-center gap-0 pb-20 min-w-max">
            {sortedRoundNumbers.map((roundNum, rIndex) => (
              <div key={roundNum} className="flex flex-col w-72">
                {/* Header da Rodada */}
                <div className="px-4 mb-8">
                  <div className="bg-primary/10 border-l-4 border-primary px-3 py-2 rounded-r-md">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">{rounds[roundNum][0].round_name}</span>
                  </div>
                </div>

                {/* Partidas com espaçamento dinâmico */}
                <div className="flex flex-col justify-around relative" style={{ height: `${containerHeight}px` }}>
                  {rounds[roundNum].map((match, mIndex) => (
                    <div key={match.id} className="relative px-4 flex flex-col justify-center h-full">
                      <Card className={`group relative z-10 border-0 bg-zinc-900 shadow-2xl overflow-hidden min-w-[220px] transition-transform hover:scale-105 duration-300 ${match.winner_id ? 'ring-1 ring-yellow-500/50' : 'ring-1 ring-white/10'}`}>
                        <div className="flex flex-col divide-y divide-white/5">
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
                        
                        {/* Match Number Badge */}
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                      </Card>

                      {/* Conectores Visuais (Lógica de Braços) */}
                      {rIndex < sortedRoundNumbers.length - 1 && (
                        <>
                          {/* Linha horizontal saindo do card */}
                          <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-primary/40"></div>
                          
                          {/* Braço vertical conectando ao par */}
                          {/* O braço vertical precisa cobrir a distância até o centro do oponente */}
                          <div 
                            className="absolute -right-4 w-[2px] bg-primary/40"
                            style={{
                              height: '100%',
                              top: mIndex % 2 === 0 ? '50%' : '-50%',
                            }}
                          ></div>

                          {/* Linha horizontal entrando na próxima rodada (apenas no ponto de encontro) */}
                          {mIndex % 2 === 0 && (
                             <div className="absolute -right-8 top-full w-4 h-[2px] bg-primary/40"></div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/5 border-2 border-dashed rounded-xl border-white/10">
            <Trophy className="h-16 w-16 text-muted-foreground opacity-10" />
            <h3 className="text-xl font-bold uppercase tracking-tighter">Árvore em construção</h3>
            <p className="text-muted-foreground text-sm">O chaveamento será exibido assim que o organizador gerar as partidas.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentBracketPage;