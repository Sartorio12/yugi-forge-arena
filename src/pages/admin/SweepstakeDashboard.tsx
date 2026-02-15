import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Calendar, DollarSign, CheckCircle2, XCircle, Search, Trophy, Pencil, Trash2, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- Components ---

const BetDetails = ({ betId }: { betId: number }) => {
  const { data: details, isLoading } = useQuery({
    queryKey: ["betPicks", betId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sweepstake_bet_details', {
        p_bet_id: betId
      });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="bg-muted/30 p-4 rounded-md mt-2 mb-4 border border-dashed border-primary/20">
      <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3">Escolhas do Apostador</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {details?.map((pick: any) => (
          <div key={pick.division_id} className="flex flex-col gap-2 p-2 bg-background rounded border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">D{pick.division_id}</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={pick.predicted_avatar_url} />
                <AvatarFallback className="text-[8px]"><UserIcon className="h-3 w-3" /></AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold truncate">{pick.predicted_username || 'BYE'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BetRow = ({ bet, onConfirmPayment, isConfirming }: { bet: any, onConfirmPayment: (id: number) => void, isConfirming: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <TableRow key={bet.bet_id} className="cursor-pointer hover:bg-muted/20" onClick={() => setIsExpanded(!isExpanded)}>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        <div className="font-medium">{bet.username || "Desconhecido"}</div>
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant={bet.payment_status === 'paid' ? 'default' : 'secondary'} className={bet.payment_status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'}>
                        {bet.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                </TableCell>
                <TableCell className="capitalize text-xs text-muted-foreground">{bet.payment_method || '-'}</TableCell>
                <TableCell className="text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                        {bet.payment_status !== 'paid' ? (
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onConfirmPayment(bet.bet_id)}
                                disabled={isConfirming}
                                className="h-8"
                            >
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                Confirmar
                            </Button>
                        ) : (
                            <div className="flex items-center justify-end text-green-600 text-xs font-medium">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Concluído
                            </div>
                        )}
                    </div>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={4} className="p-0 border-t-0">
                        <BetDetails betId={bet.bet_id} />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const EditSweepstakeDialog = ({ sweepstake, open, onOpenChange, onSuccess }: any) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    end_date: "",
    entry_fee: "",
    rules: ""
  });

  useEffect(() => {
    if (sweepstake) {
      setFormData({
        title: sweepstake.title,
        description: sweepstake.description || "",
        end_date: sweepstake.end_date ? new Date(sweepstake.end_date).toISOString().slice(0, 16) : "",
        entry_fee: sweepstake.entry_fee,
        rules: sweepstake.rules?.content || ""
      });
    }
  }, [sweepstake]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sweepstakes")
        .update({
          title: formData.title,
          description: formData.description,
          end_date: new Date(formData.end_date).toISOString(),
          entry_fee: Number(formData.entry_fee),
          rules: { content: formData.rules }
        })
        .eq("id", sweepstake.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Bolão Atualizado!" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Bolão</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid gap-2">
            <Label>Regulamento Completo</Label>
            <Textarea 
                className="h-32" 
                placeholder="Insira as regras detalhadas aqui..." 
                value={formData.rules} 
                onChange={e => setFormData({...formData, rules: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Prazo Final</Label>
                <Input type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
            <div className="grid gap-2">
                <Label>Taxa de Entrada (R$)</Label>
                <Input type="number" value={formData.entry_fee} onChange={e => setFormData({...formData, entry_fee: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CreateSweepstakeForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
    rules: "",
    d1: "",
    d2: "",
    d3: "",
    d4: ""
  });

  // Fetch Tournaments for selection
  const { data: tournaments } = useQuery({
    queryKey: ["adminTournamentsForSweepstake"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title")
        .is("deleted_at", null)
        .order("id", { ascending: false });
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title || !formData.deadline || !formData.d1 || !formData.d2 || !formData.d3 || !formData.d4) {
        throw new Error("Preencha todos os campos obrigatórios e selecione os 4 torneios.");
      }

      const { error } = await supabase.rpc("setup_duelist_league_sweepstake", {
        p_title: formData.title,
        p_description: formData.description,
        p_deadline: new Date(formData.deadline).toISOString(),
        p_d1_tournament_id: Number(formData.d1),
        p_d2_tournament_id: Number(formData.d2),
        p_d3_tournament_id: Number(formData.d3),
        p_d4_tournament_id: Number(formData.d4),
        p_rules: formData.rules
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Bolão Criado!" });
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Título do Bolão</Label>
        <Input 
          placeholder="Ex: Duelist League Season 1" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
        />
      </div>
      <div className="grid gap-2">
        <Label>Descrição Curta</Label>
        <Input 
          placeholder="Breve descrição..." 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
        />
      </div>
      <div className="grid gap-2">
        <Label>Regulamento Completo</Label>
        <Textarea 
            placeholder="Regras detalhadas (ex: Critérios de desempate, premiação...)" 
            value={formData.rules} 
            onChange={e => setFormData({...formData, rules: e.target.value})} 
        />
      </div>
      <div className="grid gap-2">
        <Label>Prazo Final (Encerramento das Apostas)</Label>
        <Input 
          type="datetime-local" 
          value={formData.deadline} 
          onChange={e => setFormData({...formData, deadline: e.target.value})} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
        <div className="col-span-2 font-semibold text-primary">Vincular Torneios (Divisões)</div>
        
        {['d1', 'd2', 'd3', 'd4'].map((div, idx) => (
          <div key={div} className="grid gap-2">
            <Label>Divisão {idx + 1} ({[10, 15, 20, 25][idx]} pts)</Label>
            <Select onValueChange={val => setFormData({...formData, [div]: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Torneio..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map(t => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar Bolão
      </Button>
    </div>
  );
};

const BetManager = ({ sweepstakeId }: { sweepstakeId: number }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bets, isLoading } = useQuery({
    queryKey: ["adminBets", sweepstakeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_bets_admin', {
        p_sweepstake_id: sweepstakeId
      });
      
      if (error) {
          console.error("Error fetching bets:", error);
          throw error;
      }
      return data;
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (betId: number) => {
      const { error } = await supabase
        .from("sweepstake_bets")
        .update({ payment_status: 'paid', payment_method: 'manual_admin' })
        .eq("id", betId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBets"] });
      toast({ title: "Pagamento Confirmado Manualmente" });
    }
  });

  return (
    <div className="space-y-4">
        <h3 className="font-bold text-lg">Gerenciar Apostas</h3>
        {isLoading ? <Loader2 className="animate-spin" /> : (
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bets?.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma aposta ainda.</TableCell></TableRow>
                        )}
                        {bets?.map((bet: any) => (
                            <BetRow 
                                key={bet.bet_id} 
                                bet={bet} 
                                onConfirmPayment={(id) => confirmPaymentMutation.mutate(id)}
                                isConfirming={confirmPaymentMutation.isPending}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
    </div>
  );
};

// --- Main Page ---

const SweepstakeDashboard = () => {
  const { toast } = useToast();
  const [editingSweepstake, setEditingSweepstake] = useState<any>(null);

  const { data: sweepstakes, isLoading, refetch } = useQuery({
    queryKey: ["adminSweepstakes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sweepstakes")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("sweepstakes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Bolão excluído com sucesso." });
      refetch();
    },
    onError: (err) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Painel de Bolões</h1>
      </div>

      <EditSweepstakeDialog 
        sweepstake={editingSweepstake} 
        open={!!editingSweepstake} 
        onOpenChange={(open: boolean) => !open && setEditingSweepstake(null)}
        onSuccess={refetch}
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Bolões Ativos</TabsTrigger>
          <TabsTrigger value="create">Criar Novo Bolão</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
            {isLoading ? <Loader2 className="animate-spin" /> : (
                <div className="grid grid-cols-1 gap-4">
                    {sweepstakes?.map(sw => (
                        <Card key={sw.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div>
                                    <CardTitle className="text-xl">{sw.title}</CardTitle>
                                    <CardDescription>{format(new Date(sw.created_at), "dd/MM/yyyy")}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={sw.is_active ? "default" : "secondary"}>
                                        {sw.is_active ? "Ativo" : "Encerrado"}
                                    </Badge>
                                    
                                    <Button variant="ghost" size="icon" onClick={() => setEditingSweepstake(sw)}>
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir Bolão?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Isso apagará permanentemente o bolão e todas as apostas vinculadas. Essa ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteMutation.mutate(sw.id)}>
                                                    Excluir
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 mb-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-green-500" />
                                        Entrada: R$ {sw.entry_fee}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        Fim: {format(new Date(sw.end_date), "dd/MM HH:mm")}
                                    </div>
                                </div>
                                
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="w-full">Gerenciar Apostas & Pagamentos</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Gerenciando: {sw.title}</DialogTitle>
                                        </DialogHeader>
                                        <BetManager sweepstakeId={sw.id} />
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </TabsContent>

        <TabsContent value="create">
            <Card>
                <CardHeader>
                    <CardTitle>Configurar Novo Bolão (Duelist League)</CardTitle>
                    <CardDescription>
                        Crie um bolão com 4 divisões automaticamente. Certifique-se de que os torneios D1, D2, D3 e D4 já foram criados no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateSweepstakeForm onSuccess={() => refetch()} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SweepstakeDashboard;