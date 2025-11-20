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
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";

interface ManageMultipleDecklistsProps {
  user: User;
  tournamentId: number;
  tournamentStatus: string;
  tournamentEventDate: string;
  numDecksAllowed: number;
}

interface SubmittedDeck extends Tables<'tournament_decklists'> {
  decks: Tables<'decks'> | null;
}

export const ManageMultipleDecklists = ({
  user,
  tournamentId,
  tournamentStatus,
  tournamentEventDate,
  numDecksAllowed
}: ManageMultipleDecklistsProps) => {
  const queryClient = useQueryClient();
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();

  const tournamentDate = new Date(tournamentEventDate);
  const now = new Date();
  const isTournamentLocked = tournamentStatus !== 'Aberto' || tournamentDate <= now;

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

  const { data: submittedDecks, isLoading: isLoadingSubmittedDecks } = useQuery({
    queryKey: ["submittedDecks", tournamentId, user.id],
    queryFn: async () => {
        const { data: participantData, error: participantError } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('user_id', user.id)
            .single();

        if (participantError || !participantData) {
            // Not a participant yet, so no submitted decks.
            return [];
        }

        const { data, error } = await supabase
            .from('tournament_decklists')
            .select(`
                *,
                decks (
                    id,
                    deck_name
                )
            `)
            .eq('participant_id', participantData.id);
        
        if (error) throw error;
        return data as SubmittedDeck[];
    }
  });
  
  const addDecklistMutation = useMutation({
    mutationFn: async (deckId: number) => {
        const { data: participantData, error: participantError } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('user_id', user.id)
            .single();
        
        if(participantError || !participantData) throw new Error("Participante não encontrado.");

        const { error } = await supabase.from("tournament_decklists").insert({
            participant_id: participantData.id,
            deck_id: deckId,
        });

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error("Este deck já foi enviado.");
            }
            throw error;
        }
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Sua decklist foi enviada." });
      queryClient.invalidateQueries({ queryKey: ["submittedDecks", tournamentId, user.id] });
      setSelectedDeckId(undefined); // Reset select
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Não foi possível enviar a decklist: ${error.message}`, variant: "destructive" });
    },
  });

  const removeDecklistMutation = useMutation({
    mutationFn: async (decklistId: number) => {
      const { error } = await supabase.from('tournament_decklists').delete().eq('id', decklistId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Decklist removida." });
      queryClient.invalidateQueries({ queryKey: ["submittedDecks", tournamentId, user.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Não foi possível remover a decklist: ${error.message}`, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedDeckId) {
        toast({ title: "Nenhum deck selecionado", description: "Por favor, selecione um deck para enviar.", variant: "destructive"});
        return;
    }
    if(submittedDecks && submittedDecks.length >= numDecksAllowed) {
        toast({ title: "Limite de decks atingido", description: `Você já enviou o número máximo de ${numDecksAllowed} decks.`, variant: "destructive"});
        return;
    }
    addDecklistMutation.mutate(parseInt(selectedDeckId, 10));
  };
  
  const isLoading = isLoadingUserDecks || isLoadingSubmittedDecks;

  return (
    <Card className="mt-8 bg-card/50">
      <CardHeader>
        <CardTitle>Gerenciar Decklists ({submittedDecks?.length || 0}/{numDecksAllowed})</CardTitle>
        <CardDescription>
          {isTournamentLocked 
            ? "A submissão de decklists está travada para este torneio."
            : `Você pode enviar até ${numDecksAllowed} deck(s) para este torneio.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-6">
            {/* Lista de Decks Enviados */}
            <div className="space-y-2">
                <h3 className="font-semibold">Decks Enviados:</h3>
                {submittedDecks && submittedDecks.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                        {submittedDecks.map(decklist => (
                           <li key={decklist.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                               <Link to={`/deck/${decklist.decks?.id}`} className="text-primary hover:underline">
                                 {decklist.decks?.deck_name || 'Deck sem nome'}
                               </Link>
                               {!isTournamentLocked && (
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => removeDecklistMutation.mutate(decklist.id)}
                                   disabled={removeDecklistMutation.isPending}
                                   className="text-red-500 hover:text-red-400"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               )}
                           </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">Nenhum deck enviado ainda.</p>
                )}
            </div>

            {/* Formulário de Envio */}
            {submittedDecks && submittedDecks.length < numDecksAllowed && !isTournamentLocked && (
              <div className="space-y-4 pt-4 border-t">
                 <h3 className="font-semibold">Enviar Novo Deck:</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Select
                    value={selectedDeckId}
                    onValueChange={setSelectedDeckId}
                    disabled={isTournamentLocked || isLoadingUserDecks}
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Selecione seu deck..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userDecks && userDecks.length > 0 ? (
                        userDecks
                         .filter(ud => !submittedDecks.some(sd => sd.deck_id === ud.id)) // Filtra decks já enviados
                         .map((deck) => (
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
                    disabled={isTournamentLocked || !selectedDeckId || addDecklistMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {addDecklistMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Deck"}
                  </Button>
                </div>
              </div>
            )}
            {isTournamentLocked && (
              <p className="text-sm text-muted-foreground pt-4 border-t">
                As decklists não podem ser alteradas após o início do torneio ou o fechamento das inscrições.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
