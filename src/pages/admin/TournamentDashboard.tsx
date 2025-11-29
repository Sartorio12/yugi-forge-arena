import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TournamentForm } from "@/components/forms/TournamentForm";
import { useToast } from "@/components/ui/use-toast";

const TournamentDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tables<"tournaments"> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tournamentToDeleteId, setTournamentToDeleteId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: tournaments, isLoading } = useQuery<Tables<"tournaments">[]>(
    {
      queryKey: ["admin-tournaments"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tournaments")
          .select("*, organizer_id, exclusive_organizer_only") // Added new columns
          .order("event_date", { ascending: false });
        if (error) throw error;
        return data;
      },
    },
  );

  const createTournamentMutation = useMutation({
    mutationFn: async (newTournament: TablesInsert<"tournaments">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const tournamentData = {
        ...newTournament,
        organizer_id: user.id,
      };

      // Cast to any to bypass type check since generated types are outdated
      const { error } = await supabase.from("tournaments").insert([tournamentData as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      toast({
        title: "Sucesso!",
        description: "Torneio criado com sucesso.",
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar torneio: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTournamentMutation = useMutation({
    mutationFn: async (updatedTournament: TablesInsert<"tournaments">) => {
      if (!editingTournament) throw new Error("No tournament selected for update.");
      const { error } = await supabase
        .from("tournaments")
        .update(updatedTournament)
        .eq("id", editingTournament.id);
      if (error) throw error;

      if (updatedTournament.status === "Fechado") {
        const { error: rpcError } = await supabase.rpc("release_decks_for_tournament", {
          p_tournament_id: editingTournament.id,
        });
        if (rpcError) throw rpcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      toast({
        title: "Sucesso!",
        description: "Torneio atualizado com sucesso.",
      });
      setIsFormOpen(false);
      setEditingTournament(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar torneio: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      toast({
        title: "Sucesso!",
        description: "Torneio excluído com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      setTournamentToDeleteId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir torneio: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateClick = () => {
    console.log("Criar Torneio button clicked!");
    setEditingTournament(null);
    setIsFormOpen(true);
  };

  const handleManageClick = (id: number) => {
    navigate(`/dashboard/tournaments/${id}/manage`);
  };

  const handleEditClick = (tournament: Tables<"tournaments">) => {
    setEditingTournament(tournament);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setTournamentToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tournamentToDeleteId) {
      deleteTournamentMutation.mutate(tournamentToDeleteId);
    }
  };

  const handleFormSubmit = (data: TablesInsert<"tournaments">) => {
    if (editingTournament) {
      // Ensure the ID is passed for update
      updateTournamentMutation.mutate({ ...data, id: editingTournament.id });
    } else {
      createTournamentMutation.mutate(data);
    }
  };

  return (
    <>
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gerenciar Torneios</h1>
          <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Torneio
          </Button>
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
                  <TableHead>Título</TableHead>
                  <TableHead>Data do Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments?.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">{tournament.title}</TableCell>
                    <TableCell>
                      {format(new Date(tournament.event_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{tournament.status}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleManageClick(tournament.id)}
                            disabled={(tournament as any).exclusive_organizer_only && (tournament as any).organizer_id !== currentUserId}
                          >
                            {(tournament as any).exclusive_organizer_only && (tournament as any).organizer_id !== currentUserId ? "Acesso Restrito" : "Gerenciar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(tournament)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(tournament.id)}
                            className="text-destructive"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[90vw] max-w-[900px] rounded-lg">
          <DialogHeader>
            <DialogTitle>{editingTournament ? "Editar Torneio" : "Criar Novo Torneio"}</DialogTitle>
            <DialogDescription>
              {editingTournament
                ? "Faça alterações no torneio existente."
                : "Preencha os detalhes para criar um novo torneio."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <TournamentForm
              formId="tournament-form"
              initialData={editingTournament || undefined}
              onSubmit={handleFormSubmit}
              isLoading={createTournamentMutation.isPending || updateTournamentMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button type="submit" form="tournament-form" disabled={createTournamentMutation.isPending || updateTournamentMutation.isPending}>
              {createTournamentMutation.isPending || updateTournamentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o torneio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteTournamentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TournamentDashboard;