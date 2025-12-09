import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const newsFormSchema = z.object({
  title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
  content: z.string().min(20, { message: "O conteúdo deve ter pelo menos 20 caracteres." }),
  banner: z.any().optional(),
  tournament_id: z.coerce.number().optional(),
  featuredDecks: z.array(z.object({
    deck_id: z.coerce.number({ required_error: "Selecione um deck." }),
    deck_snapshot_id: z.coerce.number().optional(),
    placement: z.string().min(1, { message: "A colocação é obrigatória." }),
  })).optional(),
});

export type NewsFormValues = z.infer<typeof newsFormSchema>;

interface NewsFormProps {
  formId: string;
  initialData?: TablesInsert<"news_posts"> & { news_post_decks?: { deck_id: number; deck_snapshot_id?: number | null; placement: string }[] };
  onSubmit: (data: NewsFormValues) => void;
  isLoading?: boolean;
}

export const NewsForm = ({ formId, initialData, onSubmit }: NewsFormProps) => {

  const { data: tournaments } = useQuery<Tables<"tournaments">[]>(
    {
      queryKey: ["all-tournaments"],
      queryFn: async () => {
        const { data, error } = await supabase.from("tournaments").select("id, title").order("event_date", { ascending: false });
        if (error) throw error;
        return data;
      },
    }
  );

  const { data: decks } = useQuery<any[]>(
    {
      queryKey: ["all-decks"],
      queryFn: async () => {
        const { data, error } = await supabase.from("decks").select("id, deck_name, profiles(username)").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
    }
  );

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      tournament_id: initialData?.tournament_id || undefined,
      featuredDecks: initialData?.news_post_decks?.map(d => ({
        ...d,
        deck_snapshot_id: d.deck_snapshot_id ?? undefined
      })) || [],
    },
  });

  const selectedTournamentId = form.watch("tournament_id");

  const { data: tournamentDecks } = useQuery({
    queryKey: ["tournament-decks-form", selectedTournamentId],
    queryFn: async () => {
      if (!selectedTournamentId) return [];
      
      const { data, error } = await supabase
        .from('tournament_decks')
        .select(`
          deck_id,
          deck_snapshot_id,
          decks (
            deck_name
          ),
          profiles (
            username
          )
        `)
        .eq('tournament_id', selectedTournamentId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedTournamentId
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "featuredDecks",
  });

  const handleSubmit = (values: NewsFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Postagem</FormLabel>
              <FormControl><Input placeholder="Ex: Novo formato, banlist, etc." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="banner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner da Postagem</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl><RichTextEditor value={field.value} onChange={field.onChange} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tournament_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Torneio Relacionado (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um torneio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tournaments?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <h3 className="text-lg font-medium mb-4">Decks em Destaque</h3>
          <div className="space-y-4">
            {fields.map((item, index) => (
              <div key={item.id} className="flex items-end gap-4 p-4 border rounded-md">
                <FormField
                  control={form.control}
                  name={`featuredDecks.${index}.deck_id`}
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Deck</FormLabel>
                      {selectedTournamentId && tournamentDecks && tournamentDecks.length > 0 ? (
                        <Select 
                          onValueChange={(val) => {
                             field.onChange(val);
                             const snapshot = tournamentDecks.find(td => td.deck_id === Number(val))?.deck_snapshot_id;
                             form.setValue(`featuredDecks.${index}.deck_snapshot_id`, snapshot);
                          }} 
                          defaultValue={String(field.value)}
                        >
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione um deck do torneio" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tournamentDecks.map((td: any) => (
                                <SelectItem key={td.deck_id} value={String(td.deck_id)}>
                                  {td.profiles?.username} - {td.decks?.deck_name || "Sem nome"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                      ) : (
                        <Select onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue(`featuredDecks.${index}.deck_snapshot_id`, undefined);
                        }} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione um deck" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {decks?.map(d => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                    {d.profiles?.username || 'Desconhecido'} - {d.deck_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Hidden field for snapshot_id */}
                <FormField
                    control={form.control}
                    name={`featuredDecks.${index}.deck_snapshot_id`}
                    render={({ field }) => <input type="hidden" {...field} value={field.value || ''} />}
                />

                <FormField
                  control={form.control}
                  name={`featuredDecks.${index}.placement`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colocação</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1º Lugar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => append({ deck_id: 0, placement: "" })}
          >
            Adicionar Deck ao Report
          </Button>
        </div>
      </form>
    </Form>
  );
};
