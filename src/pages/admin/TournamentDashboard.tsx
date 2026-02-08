import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MoreHorizontal, Calendar, Settings, Pencil, Trash2, LayoutDashboard, Trophy } from "lucide-react";
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
import { useProfile } from "@/hooks/useProfile";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TournamentDashboardProps {
}

const TournamentDashboard = ({ }: TournamentDashboardProps) => {
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

  const { profile, isLoading: isLoadingProfile } = useProfile(currentUserId || undefined);

  const { data: tournaments, isLoading } = useQuery<Tables<"tournaments">[]>(
    {
      queryKey: ["admin-tournaments"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tournaments")
          .select("*, organizer_id, exclusive_organizer_only, is_private")
          .is("deleted_at", null)
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
      const { error } = await supabase
        .from("tournaments")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
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
      updateTournamentMutation.mutate({ ...data, id: editingTournament.id });
    } else {
      createTournamentMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-3">
              <Trophy className="h-10 w-10 text-primary" />
              Gerenciar Torneios
            </h1>
            <p className="text-muted-foreground font-medium">Controle total sobre os eventos da comunidade.</p>
          </div>
          <Button onClick={handleCreateClick} size="lg" className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-5 w-5" />
            Criar Novo Torneio
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments?.map((tournament) => {
              const canManage = !((tournament as any).exclusive_organizer_only && (tournament as any).organizer_id !== currentUserId && profile?.role !== 'admin');
              const canEdit = !isLoadingProfile && profile?.role === 'admin';

              return (
                <Card key={tournament.id} className="overflow-hidden group border-border bg-gray-800/50 hover:shadow-glow transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    {tournament.banner_image_url ? (
                      <img
                        src={tournament.banner_image_url}
                        alt={tournament.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Trophy className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <Badge className={`${
                        tournament.status === 'Aberto' 
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                          : 'bg-muted/90 text-muted-foreground'
                      }`}>
                        {tournament.status}
                      </Badge>
                      {(tournament as any).is_private && (
                        <Badge variant="secondary" className="bg-yellow-500/80 text-black">PRIVADO</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic line-clamp-1 group-hover:text-primary transition-colors">
                        {tournament.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(tournament.event_date), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        onClick={() => handleManageClick(tournament.id)}
                        disabled={!canManage}
                        className="flex-1 gap-2"
                        variant={canManage ? "default" : "secondary"}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {canManage ? "Gerenciar" : "Restrito"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(tournament)}
                            disabled={!canEdit}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" /> Editar Torneio
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(tournament.id)}
                            className="text-destructive gap-2"
                            disabled={!canEdit}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir Permanentemente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })}
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o torneio e todos os dados associados.
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
    </div>
  );
};

export default TournamentDashboard;