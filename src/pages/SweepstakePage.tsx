import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Trophy, DollarSign, Clock, AlertCircle, CheckCircle2, Copy, RefreshCw, QrCode as QrIcon, CreditCard, Lock, Eye, Crown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FramedAvatar } from "@/components/FramedAvatar";

interface SweepstakePageProps {
  user: User | null;
  onLogout: () => void;
}

// Types
interface Sweepstake {
  id: number;
  title: string;
  description: string;
  entry_fee: number;
  end_date: string;
  rules?: { content: string };
  divisions: SweepstakeDivision[];
  user_bet?: SweepstakeBet;
  total_pot?: number;
}

interface SweepstakeDivision {
  id: number;
  division_name: string;
  points_reward: number;
  tournament_id: number;
  tournament_participants: {
    user_id: string;
    profiles: {
      username: string;
    }
  }[];
}

interface SweepstakeBet {
  id: number;
  payment_status: 'pending' | 'paid' | 'failed';
  picks: {
    division_id: number;
    predicted_winner_id: string;
  }[];
}

interface RankingEntry {
  user_id: string;
  username: string;
  avatar_url: string;
  total_points: number;
  correct_picks_count: number;
  bet_date: string;
}

const SweepstakeRanking = ({ sweepstake, user }: { sweepstake: Sweepstake, user: User | null }) => {
    const { data: ranking, isLoading } = useQuery({
        queryKey: ["sweepstakeRanking", sweepstake.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_sweepstake_ranking", { p_sweepstake_id: sweepstake.id });
            if (error) throw error;
            return data as RankingEntry[];
        }
    });

    const isBettingClosed = new Date() > new Date(sweepstake.end_date);
    const pot = sweepstake.total_pot || 0;
    const firstPlacePrize = pot * 0.8;
    const secondPlacePrize = pot * 0.2;

    return (
        <div className="space-y-8">
            {/* Prize Pool Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-yellow-500/10 border-yellow-500/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                            <Trophy className="h-5 w-5" /> Pote Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold">R$ {pot.toFixed(2)}</span>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-100 to-white border-yellow-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-yellow-700">1º Lugar (80%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-yellow-600">R$ {firstPlacePrize.toFixed(2)}</span>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-gray-100 to-white border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-700">2º Lugar (20%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-gray-600">R$ {secondPlacePrize.toFixed(2)}</span>
                    </CardContent>
                </Card>
            </div>

            {/* Ranking Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-primary" /> Classificação Geral
                    </CardTitle>
                    <CardDescription>
                        {isBettingClosed 
                            ? "Apostas encerradas. Palpites públicos." 
                            : "Os palpites só serão revelados após o encerramento das apostas."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : ranking && ranking.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Rank</TableHead>
                                    <TableHead>Apostador</TableHead>
                                    <TableHead className="text-center">Pontos</TableHead>
                                    <TableHead className="text-center">Acertos</TableHead>
                                    <TableHead className="text-right">Palpites</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ranking.map((entry, idx) => (
                                    <TableRow key={entry.user_id} className={user?.id === entry.user_id ? "bg-primary/5" : ""}>
                                        <TableCell className="font-bold text-lg">#{idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FramedAvatar 
                                                    userId={entry.user_id} 
                                                    avatarUrl={entry.avatar_url} 
                                                    username={entry.username} 
                                                    sizeClassName="h-8 w-8"
                                                />
                                                <span className="font-medium">{entry.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-primary">{entry.total_points}</TableCell>
                                        <TableCell className="text-center">{entry.correct_picks_count}/4</TableCell>
                                        <TableCell className="text-right">
                                            {isBettingClosed || user?.id === entry.user_id ? (
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4 mr-1" /> Ver
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-xs flex items-center justify-end">
                                                    <Lock className="h-3 w-3 mr-1" /> Oculto
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhuma aposta paga registrada ainda. Seja o primeiro!
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const SweepstakePage = ({ user, onLogout }: SweepstakePageProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedPicks, setSelectedPicks] = useState<{ [divisionId: number]: string }>({});
  
  // Payment State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Check for PayPal return
  useEffect(() => {
    const success = searchParams.get('success');
    const betId = searchParams.get('betId');
    const token = searchParams.get('token'); // PayPal sends token

    if (success === 'true' && betId && token) {
        capturePayPalPayment(token, betId);
    }
  }, [searchParams]);

  const capturePayPalPayment = async (orderID: string, betId: string) => {
      setIsPaymentLoading(true);
      try {
          const response = await fetch('/api/capture-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID })
          });
          const data = await response.json();
          if (response.ok) {
              toast({ title: "Pagamento Confirmado!", description: "Sua aposta está valendo." });
              queryClient.invalidateQueries({ queryKey: ["activeSweepstake"] });
              navigate('/bolao', { replace: true });
          } else {
              throw new Error(data.error || "Falha na captura");
          }
      } catch (error: any) {
          toast({ title: "Erro no Pagamento", description: error.message, variant: "destructive" });
      } finally {
          setIsPaymentLoading(false);
      }
  };

  const handlePixPayment = async (betId: number) => {
      setIsPaymentLoading(true);
      setQrCode(null);
      setQrCodeBase64(null);
      try {
          if (!user?.email) throw new Error("Email necessário");

          const response = await fetch('/api/create-mercadopago-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  betId, 
                  email: user.email,
                  firstName: user.user_metadata?.username || "User"
              })
          });
          
          const data = await response.json();
          if (response.ok) {
              setQrCode(data.qr_code);
              setQrCodeBase64(data.qr_code_base64);
          } else {
              throw new Error(data.error);
          }
      } catch (error: any) {
          toast({ title: "Erro ao gerar Pix", description: error.message, variant: "destructive" });
      } finally {
          setIsPaymentLoading(false);
      }
  };

  const handlePayPalPayment = async (betId: number) => {
      setIsPaymentLoading(true);
      try {
          const response = await fetch('/api/create-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ betId })
          });
          
          const data = await response.json();
          if (response.ok && data.links) {
              const approveLink = data.links.find((l: any) => l.rel === 'approve');
              if (approveLink) {
                  window.location.href = approveLink.href;
              }
          } else {
              throw new Error(data.error || "Erro ao criar ordem PayPal");
          }
      } catch (error: any) {
          toast({ title: "Erro PayPal", description: error.message, variant: "destructive" });
      } finally {
          setIsPaymentLoading(false);
      }
  };

  const copyToClipboard = () => {
      if (qrCode) {
          navigator.clipboard.writeText(qrCode);
          toast({ title: "Copiado!", description: "Código Pix copiado." });
      }
  };

  const checkStatus = async () => {
      setIsPaymentLoading(true);
      try {
          if (!sweepstake?.user_bet?.id) return;

          const response = await fetch('/api/check-mercadopago-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ betId: sweepstake.user_bet.id })
          });
          
          const data = await response.json();
          
          if (data.status === 'paid') {
              toast({ title: "Pagamento Confirmado!", description: "Sua aposta foi validada com sucesso." });
              queryClient.invalidateQueries({ queryKey: ["activeSweepstake"] });
          } else {
              toast({ title: "Ainda não confirmado", description: `Status atual: ${data.status || 'Pendente'}. Aguarde alguns instantes.` });
          }
      } catch (error) {
          console.error(error);
          toast({ title: "Erro ao verificar", description: "Tente novamente.", variant: "destructive" });
      } finally {
          setIsPaymentLoading(false);
      }
  };

  // Fetch the Active Sweepstake
  const { data: sweepstake, isLoading } = useQuery({
    queryKey: ["activeSweepstake"],
    queryFn: async () => {
      const { data: sweepstakes, error: swError } = await supabase
        .from("sweepstakes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (swError) throw swError;
      if (!sweepstakes || sweepstakes.length === 0) return null;

      const currentSweepstake = sweepstakes[0];

      // Get Divisions
      const { data: divisions, error: divError } = await supabase
        .from("sweepstake_divisions")
        .select(`
          id, division_name, points_reward, tournament_id,
          tournaments ( tournament_participants ( user_id, profiles ( username ) ) )
        `)
        .eq("sweepstake_id", currentSweepstake.id)
        .order("points_reward", { ascending: true });

      if (divError) throw divError;

      const formattedDivisions = divisions.map((d: any) => ({
        id: d.id,
        division_name: d.division_name,
        points_reward: d.points_reward,
        tournament_id: d.tournament_id,
        tournament_participants: d.tournaments?.tournament_participants || []
      }));

      // Get Pot Size (Count of Paid Bets)
      const { count } = await supabase
        .from("sweepstake_bets")
        .select("*", { count: 'exact', head: true })
        .eq("sweepstake_id", currentSweepstake.id)
        .eq("payment_status", "paid");
      
      const totalPot = (count || 0) * currentSweepstake.entry_fee;

      // Check User Bet
      let userBet = undefined;
      if (user) {
        const { data: bets } = await supabase
          .from("sweepstake_bets")
          .select("id, payment_status, sweepstake_picks(division_id, predicted_winner_id)")
          .eq("sweepstake_id", currentSweepstake.id)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (bets) {
            userBet = { id: bets.id, payment_status: bets.payment_status, picks: bets.sweepstake_picks };
        }
      }

      return {
        ...currentSweepstake,
        divisions: formattedDivisions,
        user_bet: userBet,
        total_pot: totalPot
      } as Sweepstake;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sweepstake) return;
      const missingDivisions = sweepstake.divisions.filter(d => !selectedPicks[d.id]);
      if (missingDivisions.length > 0) {
        throw new Error(`Faltam palpites para: ${missingDivisions.map(d => d.division_name).join(", ")}`);
      }
      const picksArray = Object.entries(selectedPicks).map(([divId, winnerId]) => ({
        division_id: Number(divId),
        winner_id: winnerId
      }));
      const { error } = await supabase.rpc("submit_sweepstake_bet", {
        p_sweepstake_id: sweepstake.id,
        p_picks: picksArray
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Palpites Enviados!", description: "Agora realize o pagamento." });
      queryClient.invalidateQueries({ queryKey: ["activeSweepstake"] });
    },
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" })
  });

  const handlePickChange = (divisionId: number, winnerId: string) => {
    setSelectedPicks(prev => ({ ...prev, [divisionId]: winnerId }));
  };

  const isBettingClosed = sweepstake && new Date() > new Date(sweepstake.end_date);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {!sweepstake && !isLoading && (
            <div className="text-center py-20">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Nenhum Bolão Ativo</h2>
            </div>
        )}

        {isLoading && <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}

        {sweepstake && (
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
                        {sweepstake.title}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{sweepstake.description}</p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm font-medium mt-4">
                        <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Encerra em</p>
                                <p>{format(new Date(sweepstake.end_date), "dd/MM, HH:mm", { locale: ptBR })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Entrada</p>
                                <p className="text-green-400">R$ {sweepstake.entry_fee.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        {sweepstake.rules && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-auto py-3 bg-card border-border hover:bg-muted">
                                        <FileText className="h-5 w-5 mr-2 text-primary" />
                                        Regulamento
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Regulamento do Bolão</DialogTitle>
                                    </DialogHeader>
                                    <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed mt-4">
                                        {sweepstake.rules.content || "Nenhum regulamento específico definido."}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                <Tabs defaultValue="bet" className="max-w-4xl mx-auto">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bet">Apostar</TabsTrigger>
                        <TabsTrigger value="ranking">Ranking & Transparência</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bet" className="mt-6">
                        {/* User Bet Status / Payment */}
                        {sweepstake.user_bet ? (
                            <Card className={`border-2 ${sweepstake.user_bet.payment_status === 'paid' ? 'border-green-500/50 bg-green-950/10' : 'border-yellow-500/50 bg-yellow-950/10'}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {sweepstake.user_bet.payment_status === 'paid' ? (
                                            <>
                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                                Aposta Confirmada!
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-6 w-6 text-yellow-500" />
                                                Pagamento Pendente
                                            </>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {sweepstake.user_bet.payment_status === 'paid' 
                                            ? "Boa sorte! Acompanhe o ranking na próxima aba." 
                                            : "Realize o pagamento para validar seus palpites."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {sweepstake.user_bet.payment_status === 'pending' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Button 
                                                    variant="outline" 
                                                    className="h-24 flex flex-col items-center justify-center gap-2 border-primary/20 hover:border-primary hover:bg-primary/5"
                                                    onClick={() => handlePixPayment(sweepstake.user_bet!.id)}
                                                    disabled={isPaymentLoading}
                                                >
                                                    <QrIcon className="h-8 w-8 text-primary" />
                                                    <span className="font-bold">Pix (R$ {sweepstake.entry_fee.toFixed(2)})</span>
                                                    <span className="text-xs text-muted-foreground">Automático</span>
                                                </Button>

                                                <Button 
                                                    variant="outline" 
                                                    className="h-24 flex flex-col items-center justify-center gap-2 border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5"
                                                    onClick={() => handlePayPalPayment(sweepstake.user_bet!.id)}
                                                    disabled={isPaymentLoading}
                                                >
                                                    <CreditCard className="h-8 w-8 text-blue-500" />
                                                    <span className="font-bold">PayPal (USD/BRL)</span>
                                                    <span className="text-xs text-muted-foreground">Internacional</span>
                                                </Button>
                                            </div>

                                            {isPaymentLoading && <div className="flex justify-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

                                            {qrCode && (
                                                <div className="mt-4 p-6 bg-white rounded-lg border border-border text-center space-y-4 shadow-lg animate-in fade-in zoom-in slide-in-from-bottom-4">
                                                    <h3 className="text-black font-bold text-lg">Escaneie o QR Code</h3>
                                                    {qrCodeBase64 && <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" className="mx-auto w-48 h-48" />}
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 p-2 bg-gray-100 rounded border text-xs font-mono break-all text-black overflow-hidden h-10 flex items-center">
                                                            {qrCode.substring(0, 30)}...
                                                        </div>
                                                        <Button size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={checkStatus} className="text-primary w-full">
                                                        <RefreshCw className="mr-2 h-4 w-4" /> Já paguei, verificar agora
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                                        <h3 className="md:col-span-2 font-semibold mb-2">Seus Palpites:</h3>
                                        {sweepstake.divisions.map(div => {
                                            const pick = sweepstake.user_bet!.picks.find(p => p.division_id === div.id);
                                            const player = div.tournament_participants.find(p => p.user_id === pick?.predicted_winner_id);
                                            return (
                                                <div key={div.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md border border-border">
                                                    <span className="text-sm font-medium">{div.division_name}</span>
                                                    <span className="font-bold text-primary">{player?.profiles.username || "Desconhecido"}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            /* Betting Form */
                            !isBettingClosed ? (
                                <div className="space-y-8">
                                    {!user && <Alert className="border-yellow-500 text-yellow-500"><AlertCircle className="h-4 w-4" /><AlertTitle>Login Necessário</AlertTitle><AlertDescription>Faça login para apostar.</AlertDescription></Alert>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {sweepstake.divisions.map((division) => (
                                            <Card key={division.id} className="border-l-4 border-l-primary hover:border-l-accent transition-colors">
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle>{division.division_name}</CardTitle>
                                                        <Badge variant="secondary" className="bg-primary/20 text-primary">+{division.points_reward} pts</Badge>
                                                    </div>
                                                    <CardDescription>Quem será o campeão?</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <Select disabled={!user} onValueChange={(val) => handlePickChange(division.id, val)}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecione um jogador..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {division.tournament_participants.length > 0 ? division.tournament_participants.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.profiles.username}</SelectItem>) : <div className="p-2 text-center text-xs text-muted-foreground">Nenhum participante.</div>}
                                                        </SelectContent>
                                                    </Select>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="flex justify-end pt-4 border-t border-border">
                                        <Button size="lg" className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 text-white font-bold" onClick={() => submitMutation.mutate()} disabled={!user || submitMutation.isPending}>
                                            {submitMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Confirmar Palpites
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-muted/10 rounded-lg border border-border">
                                    <Clock className="h-12 w-12 text-destructive mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-destructive">Apostas Encerradas</h2>
                                </div>
                            )
                        )}
                    </TabsContent>

                    <TabsContent value="ranking" className="mt-6">
                        <SweepstakeRanking sweepstake={sweepstake} user={user} />
                    </TabsContent>
                </Tabs>
            </div>
        )}
      </main>
    </div>
  );
};

export default SweepstakePage;
