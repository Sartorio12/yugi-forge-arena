import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Save, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PollManagerModalProps {
  newsPostId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newsTitle?: string;
}

interface PollFormData {
  question: string;
  poll_type: 'user_selection' | 'custom';
  max_votes_per_user: number;
  expires_at: Date | undefined;
  is_active: boolean;
}

export const PollManagerModal = ({ newsPostId, open, onOpenChange, newsTitle }: PollManagerModalProps) => {
  const queryClient = useQueryClient();
  const [showVotes, setShowVotes] = useState(false);
  const [formData, setFormData] = useState<PollFormData>({
    question: "",
    poll_type: "user_selection",
    max_votes_per_user: 1,
    expires_at: undefined,
    is_active: true
  });

  // Fetch existing poll
  const { data: existingPoll, isLoading, isError } = useQuery({
    queryKey: ["adminPoll", newsPostId],
    queryFn: async () => {
      if (!newsPostId) return null;
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("news_post_id", newsPostId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!newsPostId && open,
  });

  // Fetch detailed votes
  const { data: detailedVotes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ["adminPollVotes", existingPoll?.id],
    queryFn: async () => {
      if (!existingPoll?.id) return [];
      const { data, error } = await supabase.rpc('get_poll_votes_admin', { p_poll_id: existingPoll.id });
      if (error) throw error;
      return data;
    },
    enabled: !!existingPoll?.id && showVotes,
  });

  useEffect(() => {
    if (existingPoll) {
      setFormData({
        question: existingPoll.question,
        poll_type: existingPoll.poll_type as 'user_selection' | 'custom',
        max_votes_per_user: existingPoll.max_votes_per_user || 1,
        expires_at: existingPoll.expires_at ? new Date(existingPoll.expires_at) : undefined,
        is_active: existingPoll.is_active ?? true
      });
    } else {
        // Reset if opening for a new post
        setFormData({
            question: "",
            poll_type: "user_selection",
            max_votes_per_user: 1,
            expires_at: undefined,
            is_active: true
        });
        setShowVotes(false);
    }
  }, [existingPoll, open]);

  const upsertMutation = useMutation({
    mutationFn: async (data: PollFormData) => {
      if (!newsPostId) throw new Error("ID da notícia inválido");
      
      const payload = {
        news_post_id: newsPostId,
        question: data.question,
        poll_type: data.poll_type,
        max_votes_per_user: data.max_votes_per_user,
        expires_at: data.expires_at ? data.expires_at.toISOString() : null,
        is_active: data.is_active
      };

      if (existingPoll?.id) {
        const { error } = await supabase
          .from("polls")
          .update(payload)
          .eq("id", existingPoll.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("polls")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Enquete salva com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["adminPoll", newsPostId] });
      // We also invalidate the public poll query just in case
      queryClient.invalidateQueries({ queryKey: ["poll", newsPostId] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingPoll?.id) return;
      const { error } = await supabase.from("polls").delete().eq("id", existingPoll.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Enquete removida." });
      queryClient.invalidateQueries({ queryKey: ["adminPoll", newsPostId] });
      queryClient.invalidateQueries({ queryKey: ["poll", newsPostId] });
      onOpenChange(false);
    }
  });

  if (!newsPostId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Enquete</DialogTitle>
          <DialogDescription>
             Vinculada à notícia: <span className="font-semibold text-primary">{newsTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="question">Pergunta</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Ex: Quem são os melhores jogadores?"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select 
                        value={formData.poll_type} 
                        onValueChange={(val: any) => setFormData({ ...formData, poll_type: val })}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user_selection">Seleção de Jogadores</SelectItem>
                            <SelectItem value="custom">Opções Personalizadas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="max_votes">Votos por Usuário</Label>
                    <Input
                        id="max_votes"
                        type="number"
                        min={1}
                        value={formData.max_votes_per_user}
                        onChange={(e) => setFormData({ ...formData, max_votes_per_user: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Expira em (Opcional)</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.expires_at && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expires_at ? format(formData.expires_at, "PPP 'às' HH:mm", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={formData.expires_at}
                            onSelect={(date) => setFormData({ ...formData, expires_at: date || undefined })}
                            initialFocus
                        />
                        <div className="p-3 border-t border-border">
                            <Input
                                type="time"
                                value={formData.expires_at ? format(formData.expires_at, "HH:mm") : ""}
                                onChange={(e) => {
                                    if (!formData.expires_at && !e.target.value) return;
                                    const [hours, minutes] = e.target.value.split(":");
                                    const newDate = formData.expires_at || new Date();
                                    newDate.setHours(parseInt(hours) || 0);
                                    newDate.setMinutes(parseInt(minutes) || 0);
                                    setFormData({ ...formData, expires_at: newDate });
                                }}
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded-md">
                <Switch 
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is-active">Enquete Ativa / Visível</Label>
            </div>
            
            {formData.poll_type === 'custom' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded text-sm text-yellow-500">
                    Nota: O gerenciamento de opções personalizadas ainda não foi implementado nesta versão do painel. Use "Seleção de Jogadores" ou insira opções via SQL.
                </div>
            )}

            {/* Admin Votes View */}
            {existingPoll && (
                <div className="border-t pt-4 mt-4">
                    <Button 
                        variant="secondary" 
                        className="w-full mb-4" 
                        onClick={() => setShowVotes(!showVotes)}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        {showVotes ? "Ocultar Votos" : "Ver Quem Votou em Quem (Secreto)"}
                    </Button>

                    {showVotes && (
                        <div className="bg-muted/30 rounded-md border">
                            {isLoadingVotes ? (
                                <div className="p-4 text-center"><Loader2 className="animate-spin inline" /></div>
                            ) : detailedVotes && detailedVotes.length > 0 ? (
                                <ScrollArea className="h-[200px] rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Eleitor</TableHead>
                                                <TableHead>Votou em</TableHead>
                                                <TableHead className="text-right">Data</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailedVotes.map((vote: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-xs">{vote.voter_name}</TableCell>
                                                    <TableCell className="text-xs font-bold text-primary">{vote.vote_target}</TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground">
                                                        {format(new Date(vote.voted_at), "dd/MM HH:mm")}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            ) : (
                                <div className="p-4 text-center text-muted-foreground">Nenhum voto registrado ainda.</div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between w-full">
            {existingPoll ? (
                <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            ) : <div />} {/* Spacer */}
            
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={() => upsertMutation.mutate(formData)} disabled={upsertMutation.isPending}>
                    {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Enquete
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
