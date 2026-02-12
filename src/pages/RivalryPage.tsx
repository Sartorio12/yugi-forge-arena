import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { UserSelector } from "@/components/polls/UserSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Loader2, Swords, Calendar, Trophy, Percent, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { MatchHistoryList } from "@/components/MatchHistoryList";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface RivalryPageProps {
  user: User | null;
  onLogout: () => void;
}

export const RivalryPage = ({ user, onLogout }: RivalryPageProps) => {
  const { t, i18n } = useTranslation();
  const [player1, setPlayer1] = useState<{id: string, username: string, avatar_url: string | null, tag?: string} | null>(null);
  const [player2, setPlayer2] = useState<{id: string, username: string, avatar_url: string | null, tag?: string} | null>(null);

  const localeMap: { [key: string]: any } = {
    pt: ptBR,
    en: enUS,
    es: es,
  };
  const currentLocale = localeMap[i18n.language] || ptBR;

  // Head-to-head history
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["rivalry", player1?.id, player2?.id],
    queryFn: async () => {
      if (!player1 || !player2) return null;
      const { data, error } = await supabase.rpc("get_rivalry_history", {
        p_player1_id: player1.id,
        p_player2_id: player2.id
      });
      if (error) throw error;
      return data;
    },
    enabled: !!player1 && !!player2
  });

  // Total match wins for Player 1 (Only counts wins with an opponent recorded in matches)
  const { data: p1MatchWinsCount } = useQuery({
    queryKey: ["playerMatchWins", player1?.id],
    queryFn: async () => {
      if (!player1) return 0;
      const { count, error } = await supabase
        .from("tournament_matches")
        .select("id", { count: 'exact', head: true })
        .eq("winner_id", player1.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!player1
  });

  // Total match wins for Player 2
  const { data: p2MatchWinsCount } = useQuery({
    queryKey: ["playerMatchWins", player2?.id],
    queryFn: async () => {
      if (!player2) return 0;
      const { count, error } = await supabase
        .from("tournament_matches")
        .select("id", { count: 'exact', head: true })
        .eq("winner_id", player2.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!player2
  });

  const p1H2HWins = history?.filter(h => h.winner_id === player1?.id).length || 0;
  const p2H2HWins = history?.filter(h => h.winner_id === player2?.id).length || 0;
  
  // Use career wins for the comparison bar (Global performance)
  const p1Total = p1MatchWinsCount || 0;
  const p2Total = p2MatchWinsCount || 0;
  const totalGlobalWins = p1Total + p2Total;
  const p1PowerRate = totalGlobalWins > 0 ? Math.round((p1Total / totalGlobalWins) * 100) : 50;
  const p2PowerRate = totalGlobalWins > 0 ? Math.round((p2Total / totalGlobalWins) * 100) : 50;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-900/10 to-slate-950 text-foreground">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="container mx-auto max-w-5xl py-12 px-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] -z-10" />
        
        <header className="text-center mb-16 relative">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                Arena de Elite
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                {t('rivalry_page.title')}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('rivalry_page.subtitle')}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 mb-16 items-center">
            {/* Player 1 Selector */}
            <div className={`relative group transition-all duration-500 ${player1 ? 'scale-105' : ''}`}>
                <div className={`p-8 rounded-3xl border-2 transition-all duration-500 relative overflow-hidden ${player1 ? 'border-primary bg-primary/5 shadow-[0_0_50px_-12px_rgba(147,51,234,0.3)]' : 'border-dashed border-white/10 bg-white/5 hover:border-white/20'}`}>
                    {player1 ? (
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl animate-pulse" />
                                <FramedAvatar userId={player1.id} avatarUrl={player1.avatar_url} sizeClassName="h-32 w-32 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black mb-1 truncate w-full">
                                {player1.tag && <span className="text-primary text-xl mr-2">[{player1.tag}]</span>}
                                {player1.username}
                            </h2>
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                    {p1MatchWinsCount || 0} {t('ranking_page.wins')}
                                </span>
                            </div>
                            <button 
                                onClick={() => setPlayer1(null)} 
                                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors border border-white/10"
                            >
                                {t('rivalry_page.change')}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                                <Swords className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">{t('rivalry_page.duelist_1')}</h3>
                            <UserSelector onSelect={setPlayer1} excludeIds={player2 ? [player2.id] : []} placeholder={t('rivalry_page.search_placeholder')} />
                        </div>
                    )}
                </div>
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center justify-center py-4 lg:py-0">
                <div className={`font-black text-3xl rounded-2xl h-20 w-20 flex items-center justify-center shadow-2xl border-2 z-10 transition-all duration-700 rotate-12 group-hover:rotate-0 ${player1 && player2 ? 'bg-primary border-primary-glow text-white animate-bounce-slow' : 'bg-slate-800 border-white/10 text-white/20'}`}>
                    VS
                </div>
                <div className="h-24 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden lg:block mt-4" />
            </div>

            {/* Player 2 Selector */}
            <div className={`relative group transition-all duration-500 ${player2 ? 'scale-105' : ''}`}>
                <div className={`p-8 rounded-3xl border-2 transition-all duration-500 relative overflow-hidden ${player2 ? 'border-primary bg-primary/5 shadow-[0_0_50px_-12px_rgba(147,51,234,0.3)]' : 'border-dashed border-white/10 bg-white/5 hover:border-white/20'}`}>
                    {player2 ? (
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl animate-pulse" />
                                <FramedAvatar userId={player2.id} avatarUrl={player2.avatar_url} sizeClassName="h-32 w-32 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black mb-1 truncate w-full">
                                {player2.tag && <span className="text-primary text-xl mr-2">[{player2.tag}]</span>}
                                {player2.username}
                            </h2>
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                    {p2MatchWinsCount || 0} {t('ranking_page.wins')}
                                </span>
                            </div>
                            <button 
                                onClick={() => setPlayer2(null)} 
                                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors border border-white/10"
                            >
                                {t('rivalry_page.change')}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                                <Swords className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">{t('rivalry_page.duelist_2')}</h3>
                            <UserSelector onSelect={setPlayer2} excludeIds={player1 ? [player1.id] : []} placeholder={t('rivalry_page.search_placeholder')} />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Results Area */}
        {isHistoryLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : (
            <div className="relative z-10">
                {/* CASE 1: HEAD TO HEAD (Both Selected) */}
                {player1 && player2 && history && (
                    <div className="space-y-12 animate-in zoom-in-95 duration-700">
                        
                        {/* Win Probability / Rate Bar */}
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em]">
                                <span className={p1Total >= p2Total ? 'text-primary' : 'text-muted-foreground'}>
                                    {player1.tag && `[${player1.tag}] `}{player1.username} {p1PowerRate}%
                                </span>
                                <span className={p2Total >= p1Total ? 'text-primary' : 'text-muted-foreground'}>
                                    {p2PowerRate}% {player2.tag && `[${player2.tag}] `}{player2.username}
                                </span>
                            </div>
                            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                                <div className="h-full flex rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000" 
                                        style={{ width: `${p1PowerRate}%` }} 
                                    />
                                    <div 
                                        className="h-full bg-slate-800 transition-all duration-1000" 
                                        style={{ width: `${100 - p1PowerRate}%` }} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Large Scoreboard */}
                        <div className="flex items-center justify-center gap-12 md:gap-24 relative">
                            <div className="flex flex-col items-center">
                                <div className={`text-7xl md:text-9xl font-black ${p1H2HWins >= p2H2HWins ? 'text-white drop-shadow-[0_0_20px_rgba(147,51,234,0.5)]' : 'text-white/20'}`}>
                                    {p1H2HWins}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-muted-foreground">SCORE</span>
                            </div>
                            
                            <div className="text-white/5 font-black text-6xl md:text-8xl italic">VS</div>
                            
                            <div className="flex flex-col items-center">
                                <div className={`text-7xl md:text-9xl font-black ${p2H2HWins >= p1H2HWins ? 'text-white drop-shadow-[0_0_20px_rgba(147,51,234,0.5)]' : 'text-white/20'}`}>
                                    {p2H2HWins}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-muted-foreground">SCORE</span>
                            </div>
                        </div>

                        {/* Match List - Premium Style */}
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <h3 className="text-xl font-bold flex items-center gap-2 px-2">
                                <Percent className="h-5 w-5 text-primary" />
                                {t('rivalry_page.head_to_head_title')}
                            </h3>
                            
                            {history && history.length === 0 ? (
                                <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <p className="text-muted-foreground italic">{t('rivalry_page.no_matches_vs')}</p>
                                </div>
                            ) : history ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {history.map((match: any, idx: number) => (
                                        <div 
                                            key={match.id} 
                                            className="group flex items-center justify-between p-6 bg-gradient-to-r from-white/5 to-transparent hover:from-primary/10 transition-all duration-300 rounded-2xl border border-white/5 hover:border-primary/20"
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                        >
                                            <div className="flex items-center gap-6">
                                                <Trophy className={`h-6 w-6 shrink-0 ${match.winner_id === player1.id ? 'text-primary' : 'text-purple-400'}`} />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-black text-lg group-hover:text-primary transition-colors">{match.tournament_title}</span>
                                                      {match.is_wo && (
                                                        <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">W.O.</Badge>
                                                      )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {match.tournament_date ? format(new Date(match.tournament_date), "dd/MM/yyyy") : "Data pendente"} • {match.round_name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="hidden md:flex flex-col text-right">
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Vencedor</span>
                                                    <span className="font-black italic">
                                                        {match.winner_clan_tag && <span className="text-primary not-italic mr-1">[{match.winner_clan_tag}]</span>}
                                                        {match.winner_name}
                                                    </span>
                                                </div>
                                                <FramedAvatar userId={match.winner_id} avatarUrl={match.winner_avatar} frameUrl={match.winner_frame} sizeClassName="h-12 w-12" />
                                                <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* CASE 2 & 3: SINGLE PLAYER HISTORY */}
                {(player1 && !player2) || (!player1 && player2) ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                            <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-4">
                                <Swords className="h-8 w-8 text-primary" />
                                {t('rivalry_page.match_history_for', { 
                                    username: (player1 || player2)?.tag 
                                        ? `[${(player1 || player2)?.tag}] ${(player1 || player2)?.username}`
                                        : (player1 || player2)?.username 
                                })}
                            </h2>
                            <div className="hidden md:flex h-10 w-10 rounded-full bg-primary/20 items-center justify-center">
                                <span className="text-primary font-bold">!</span>
                            </div>
                        </div>
                        <MatchHistoryList userId={(player1?.id || player2?.id)!} />
                    </div>
                ) : null}
                
                {/* CASE 4: NO SELECTION */}
                {!player1 && !player2 && (
                    <div className="text-center py-24 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[40px] animate-pulse">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Swords className="h-10 w-10 text-white/10" />
                        </div>
                        <p className="text-2xl font-black italic text-white/20 uppercase tracking-tighter">{t('rivalry_page.select_one')}</p>
                        <p className="text-sm text-white/10 font-bold uppercase tracking-widest mt-2">{t('rivalry_page.select_two')}</p>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default RivalryPage;