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
}

export const ManageDecklist = ({ 
  user, 
  tournamentId, 
  tournamentStatus, 
  tournamentEventDate 
}: ManageDecklistProps) => {
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const tournamentDate = new Date(tournamentEventDate);
  const now = new Date();
  const isTournamentLocked = tournamentStatus !== 'Aberto' || tournamentDate <= now;

  const { data: participant, isLoading: isLoadingParticipant } = useQuery({
    queryKey: ["tournamentParticipant", tournamentId, user.id],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('user_id', user.id)
            .single();
        if (error) {
            // It's okay if not found, means not a participant.
            if (error.code === 'PGRST116') return null;
            throw error;
        };
        return data;
    },
  });

  const { data: submittedDeck, isLoading: isLoadingSubmittedDeck } = useQuery({
    queryKey: ["submittedDeck", participant?.id],
    queryFn: async () => {
        if (!participant) return null;
        const { data, error } = await supabase
            .from('tournament_decklists')
            .select('id, deck_id')
            .eq('participant_id', participant.id)
            .single(); // Since it's for single decklist
        if (error) {
            if (error.code === 'PGRST116') return null; // Not found is okay
            throw error;
        }
        return data;
    },
    enabled: !!participant,
  });

  const { data: userDecks, isLoading: isLoadingUserDecks } = useQuery({
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

  const upsertDecklistMutation = useMutation({
    mutationFn: async (deckId: number) => {
      if (!participant) throw new Error("Participante não encontrado.");
      
      const decklistData = {
        participant_id: participant.id,
        deck_id: deckId,
      };

      if (submittedDeck) {
        // Update existing decklist
        const { error } = await supabase
          .from("tournament_decklists")
          .update(decklistData)
          .eq("id", submittedDeck.id);
        if (error) throw error;
      } else {
        // Insert new decklist
        const { error } = await supabase
          .from("tournament_decklists")
          .insert(decklistData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Sua decklist foi enviada/atualizada.",
      });
      queryClient.invalidateQueries({ queryKey: ["submittedDeck", participant?.id] });
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
    upsertDecklistMutation.mutate(parseInt(selectedDeckId, 10));
  };
  
  useEffect(() => {
    setSelectedDeckId(submittedDeck?.deck_id?.toString());
  }, [submittedDeck]);

  const isLoading = isLoadingParticipant || isLoadingSubmittedDeck || isLoadingUserDecks;

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
                disabled={isTournamentLocked || !selectedDeckId || upsertDecklistMutation.isPending}
                className="w-full sm:w-auto"
              >
                {upsertDecklistMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isTournamentLocked ? "Decklist Travada" : (submittedDeck ? "Atualizar Deck" : "Enviar Deck")}
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