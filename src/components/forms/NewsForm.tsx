import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { TablesInsert } from "@/integrations/supabase/types";

const newsFormSchema = z.object({
  title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
  content: z.string().min(20, { message: "O conteúdo deve ter pelo menos 20 caracteres." }),
});

interface NewsFormProps {
  formId: string;
  initialData?: TablesInsert<"news_posts">;
  onSubmit: (data: Omit<TablesInsert<"news_posts">, 'id' | 'created_at' | 'author_id'>) => void;
  isLoading?: boolean;
}

export const NewsForm = ({ formId, initialData, onSubmit }: NewsFormProps) => {
  const form = useForm<z.infer<typeof newsFormSchema>>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof newsFormSchema>) => {
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
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo</FormLabel>
              <FormControl><RichTextEditor value={field.value} onChange={field.onChange} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};