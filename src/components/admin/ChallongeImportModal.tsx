import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const ChallongeImportModal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch recent tournaments to link the import to
  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, event_date")
        .order("event_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const fetchChallongeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fetch-challonge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar dados do Challonge');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      toast({ title: "Análise concluída", description: `${data.total_found} partidas encontradas.` });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro na análise", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!previewData || !selectedTournamentId) return;

      const matchesToInsert = previewData.matches
        .filter((m: any) => m.player1.localId && m.player2.localId) // Only import if both players are mapped
        .map((m: any) => ({
          player1_id: m.player1.localId,
          player2_id: m.player2.localId,
          winner_id: m.winner_local_id, // Can be null if draw
          round_name: `Challonge Round ${m.round}`,
          completed_at: m.completed_at
        }));

      if (matchesToInsert.length === 0) {
        throw new Error("Nenhuma partida válida para importar (jogadores não encontrados).");
      }

      const { error } = await supabase.rpc('bulk_insert_matches' as any, {
        p_tournament_id: Number(selectedTournamentId),
        p_matches: matchesToInsert
      });

      if (error) throw error;
      return matchesToInsert.length;
    },
    onSuccess: (count) => {
      toast({ title: "Importação realizada!", description: `${count} partidas foram salvas.` });
      setIsOpen(false);
      setPreviewData(null);
      setUrl("");
      // Refresh matches list if possible
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro na importação", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const validMatchesCount = previewData?.matches.filter((m: any) => m.player1.localId && m.player2.localId).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Importar do Challonge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Partidas do Challonge</DialogTitle>
          <DialogDescription>
            Importe o histórico de partidas para o sistema de Rivalidades.
            Certifique-se de que os nomes no Challonge correspondem aos nomes de usuário no site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Vincular ao Torneio do Sistema</Label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um torneio..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title} ({new Date(t.event_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>URL do Torneio Challonge</Label>
            <Input 
              placeholder="https://challonge.com/meu_torneio" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>API Key (Challonge)</Label>
            <Input 
              type="password" 
              placeholder="Deixe em branco para usar a chave do sistema (.env)" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Você pode encontrar sua chave em <a href="https://challonge.com/settings/developer" target="_blank" className="underline">challonge.com/settings/developer</a>.
            </p>
          </div>

          {!previewData && (
            <Button 
              onClick={() => fetchChallongeMutation.mutate()} 
              disabled={fetchChallongeMutation.isPending || !url || !selectedTournamentId}
              className="w-full"
            >
              {fetchChallongeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analisar Dados
            </Button>
          )}

          {previewData && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resultado da Análise
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)}>Nova Busca</Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Total de Partidas: <strong>{previewData.total_found}</strong></div>
                <div>Partidas Válidas: <strong className="text-green-600">{validMatchesCount}</strong></div>
              </div>

              {previewData.unknown_participants.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Jogadores não encontrados ({previewData.unknown_participants.length})</AlertTitle>
                  <AlertDescription className="text-xs">
                    Os seguintes nomes não foram encontrados no banco de dados e suas partidas serão ignoradas:
                    <ScrollArea className="h-24 w-full rounded border p-2 mt-2 bg-background/50">
                      {previewData.unknown_participants.join(", ")}
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {validMatchesCount === 0 ? (
                <div className="text-center text-red-500 font-bold py-2">
                  Nenhuma partida pode ser importada. Verifique os nomes dos usuários.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <HelpCircle className="h-3 w-3 inline mr-1" />
                  Serão importadas {validMatchesCount} partidas para o torneio selecionado.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => importMutation.mutate()} 
            disabled={!previewData || validMatchesCount === 0 || importMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
