import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ManageDecklistProps {
  user: User;
  tournamentId: number;
  currentDeckId: number | null;
  tournamentStatus: string;
  tournamentEventDate: string;
}

export const ManageDecklist = ({ 
  user, 
  tournamentId, 
  currentDeckId, 
  tournamentStatus, 
  tournamentEventDate 
}: ManageDecklistProps) => {
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(
    currentDeckId?.toString()
  );

  // --- LÓGICA DE TRAVA ---
  const tournamentDate = new Date(tournamentEventDate);
  const now = new Date();
  const isTournamentLocked = tournamentStatus !== 'Aberto' || tournamentDate <= now;
  // -----------------------

  const { data: userDecks, isLoading: isLoadingDecks } = useQuery({
    queryKey: ["userDecks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const updateDecklistMutation = useMutation({
    mutationFn: async (deckId: number | null) => {
      const { error } = await supabase
        .from("tournament_participants")
        .update({ deck_id: deckId })
        .eq("user_id", user.id)
        .eq("tournament_id", tournamentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Sua decklist foi enviada/atualizada.",
      });
      queryClient.invalidateQueries({ queryKey: ["tournamentParticipants", tournamentId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Não foi possível enviar a decklist: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedDeckId) {
        toast({
            title: "Nenhum deck selecionado",
            description: "Por favor, selecione um deck para enviar.",
            variant: "destructive"
        });
        return;
    }
    updateDecklistMutation.mutate(parseInt(selectedDeckId, 10));
  };
  
  useEffect(() => {
    setSelectedDeckId(currentDeckId?.toString());
  }, [currentDeckId]);

  return (
    <Card className="mt-8 bg-card/50">
      <CardHeader>
        <CardTitle>Gerenciar Decklist</CardTitle>
        <CardDescription>
          {isTournamentLocked 
            ? "A submissão de decklists está travada para este torneio."
            : "Selecione um de seus decks salvos para vincular a este torneio."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingDecks ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select
                value={selectedDeckId}
                onValueChange={setSelectedDeckId}
                disabled={isTournamentLocked || isLoadingDecks}
              >
                <SelectTrigger className="flex-grow">
                  <SelectValue placeholder="Selecione seu deck..." />
                </SelectTrigger>
                <SelectContent>
                  {userDecks && userDecks.length > 0 ? (
                    userDecks.map((deck) => (
                      <SelectItem key={deck.id} value={deck.id.toString()}>
                        {deck.deck_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Você não tem decks salvos.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSubmit} 
                disabled={isTournamentLocked || !selectedDeckId || updateDecklistMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateDecklistMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isTournamentLocked ? "Decklist Travada" : (currentDeckId ? "Atualizar Deck" : "Enviar Deck")}
              </Button>
            </div>
            {isTournamentLocked && (
              <p className="text-sm text-muted-foreground pt-2">
                As decklists não podem ser alteradas após o início do torneio.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};