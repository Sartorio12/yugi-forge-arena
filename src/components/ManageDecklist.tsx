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
  tournamentStatus: string;
  tournamentEventDate: string;
  tournamentType?: string;
  allowDeckUpdates?: boolean;
}

export const ManageDecklist = ({ 
  user, 
  tournamentId, 
  tournamentStatus, 
  tournamentEventDate,
  tournamentType,
  allowDeckUpdates = false
}: ManageDecklistProps) => {
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const tournamentDate = new Date(tournamentEventDate);
  const now = new Date();
  // Lock if: (Status isn't open OR date passed) AND we aren't explicitly allowing updates (transition phase)
  const isTournamentLocked = (tournamentStatus !== 'Aberto' || tournamentDate <= now) && !allowDeckUpdates;

  const { data: submittedDeck, isLoading: isLoadingSubmittedDeck } = useQuery({
    queryKey: ["submittedDeck", tournamentId, user.id],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('tournament_decks')
            .select('deck_id, deck_snapshot_id')
            .eq('tournament_id', tournamentId)
            .eq('user_id', user.id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null; // Not found is okay
            throw error;
        }
        return data;
    },
  });

  const { data: userDecks, isLoading: isLoadingUserDecks } = useQuery({
    queryKey: ["userDecks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name, is_genesys")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const submitDecklistMutation = useMutation({
    mutationFn: async (deckId: number) => {
      const { error } = await supabase.rpc('submit_deck_to_tournament', {
        p_tournament_id: tournamentId,
        p_deck_id: deckId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Sua decklist foi enviada/atualizada.",
      });
      queryClient.invalidateQueries({ queryKey: ["submittedDeck", tournamentId, user.id] });
    },
    onError: (error: any) => {
      console.error("Submit decklist error:", error);
      const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      toast({
        title: "Erro",
        description: `Não foi possível enviar a decklist: ${errorMessage}`,
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
    submitDecklistMutation.mutate(parseInt(selectedDeckId, 10));
  };
  
  useEffect(() => {
    setSelectedDeckId(submittedDeck?.deck_id?.toString());
  }, [submittedDeck]);

  const isLoading = isLoadingSubmittedDeck || isLoadingUserDecks;

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
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select
                value={selectedDeckId}
                onValueChange={setSelectedDeckId}
                disabled={isTournamentLocked || isLoading}
              >
                <SelectTrigger className="flex-grow">
                  <SelectValue placeholder="Selecione seu deck..." />
                </SelectTrigger>
                <SelectContent>
                  {userDecks && userDecks.length > 0 ? (
                    userDecks.filter(deck => tournamentType !== 'genesys' || deck.is_genesys).length > 0 ? (
                      userDecks
                        .filter(deck => tournamentType !== 'genesys' || deck.is_genesys)
                        .map((deck) => (
                        <SelectItem key={deck.id} value={deck.id.toString()}>
                          {deck.deck_name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">
                        Nenhum deck Genesys encontrado. Ative o "Modo Genesys" no Deck Builder ao salvar seu deck.
                      </div>
                    )
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Você não tem decks salvos.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSubmit} 
                disabled={isTournamentLocked || !selectedDeckId || submitDecklistMutation.isPending}
                className="w-full sm:w-auto"
              >
                {submitDecklistMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isTournamentLocked ? "Decklist Travada" : (submittedDeck ? "Atualizar Deck" : "Enviar Deck")}
              </Button>
            </div>
            {isTournamentLocked && submittedDeck && (
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