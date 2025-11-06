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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const newsPostFormSchema = z.object({
  title: z.string().min(2, { message: "O título deve ter pelo menos 2 caracteres." }),
  content: z.string().optional(),
  tournament_id: z.coerce.number().optional(),
  featuredDecks: z.array(z.object({
    deck_id: z.coerce.number({ required_error: "Selecione um deck." }),
    placement: z.string().min(1, { message: "A colocação é obrigatória." }),
  })).optional(),
});

export type NewsPostFormValues = z.infer<typeof newsPostFormSchema>;

interface NewsPostFormProps {
  formId: string;
  initialData?: TablesInsert<"news_posts"> & { news_post_decks?: { deck_id: number; placement: string }[] };
  onSubmit: (data: NewsPostFormValues) => void;
  isLoading?: boolean;
}

export const NewsPostForm = ({
  formId,
  initialData,
  onSubmit,
}: NewsPostFormProps) => {

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

  const { data: decks } = useQuery<Tables<"decks">[]>(
    {
      queryKey: ["all-decks"],
      queryFn: async () => {
        const { data, error } = await supabase.from("decks").select("id, deck_name").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
    }
  );

  const form = useForm<NewsPostFormValues>({
    resolver: zodResolver(newsPostFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      tournament_id: initialData?.tournament_id || undefined,
      featuredDecks: initialData?.news_post_decks || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "featuredDecks",
  });

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Título da Postagem" {...field} />
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
              <FormControl>
                <Textarea placeholder="Escreva a notícia aqui... (Suporta Markdown)" {...field} rows={15} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tournament_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Torneio (Opcional)</FormLabel>
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
                      <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione um deck" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {decks?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.deck_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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