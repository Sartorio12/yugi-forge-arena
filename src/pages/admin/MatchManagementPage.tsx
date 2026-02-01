import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ChallongeImportModal } from "@/components/admin/ChallongeImportModal";

interface MatchData {
  id: number;
  tournament_id: number;
  tournament_title: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  winner_id: string;
  winner_name: string;
  round_name: string;
  created_at: string;
}

const MatchManagementPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<MatchData | null>(null);

  const { data: matches, isLoading } = useQuery<MatchData[]>({
    queryKey: ["admin-matches", page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_matches" as any, {
        limit_count: pageSize,
        offset_count: page * pageSize,
      });
      if (error) throw error;
      return data as unknown as MatchData[];
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("tournament_matches")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({
        title: "Sucesso!",
        description: "Confronto excluído com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      setMatchToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir confronto: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (match: MatchData) => {
    setMatchToDelete(match);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (matchToDelete) {
      deleteMatchMutation.mutate(matchToDelete.id);
    }
  };

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Confrontos</h1>
        <div className="flex gap-2">
          <ChallongeImportModal />
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => p + 1)}
            disabled={!matches || matches.length < pageSize || isLoading}
          >
            Próximo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg bg-gradient-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Torneio</TableHead>
                <TableHead>Jogador 1</TableHead>
                <TableHead>Jogador 2</TableHead>
                <TableHead>Vencedor</TableHead>
                <TableHead>Rodada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches?.map((match) => (
                <TableRow key={match.id}>
                  <TableCell>
                    {format(new Date(match.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{match.tournament_title}</TableCell>
                  <TableCell>
                    <span className={match.winner_id === match.player1_id ? "text-green-500 font-bold" : ""}>
                      {match.player1_name || "Desconhecido"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={match.winner_id === match.player2_id ? "text-green-500 font-bold" : ""}>
                      {match.player2_name || "Desconhecido"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {match.winner_name ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                        {match.winner_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Empate/Nulo</Badge>
                    )}
                  </TableCell>
                  <TableCell>{match.round_name}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => handleDeleteClick(match)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {matches?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum confronto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Confronto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o confronto entre <strong>{matchToDelete?.player1_name}</strong> e <strong>{matchToDelete?.player2_name}</strong>?
              <br/><br/>
              Esta ação removerá o registro do histórico e recalculará as estatísticas na próxima atualização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteMatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default MatchManagementPage;
