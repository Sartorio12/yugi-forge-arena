import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";

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

export const clanFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres.").max(50, "O nome não pode ter mais de 50 caracteres."),
  tag: z.string().min(2, "A tag deve ter de 2 a 5 caracteres.").max(5, "A tag deve ter de 2 a 5 caracteres.").regex(/^[A-Z0-9]+$/, "A tag deve conter apenas letras maiúsculas e números."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres.").max(500, "A descrição não pode ter mais de 500 caracteres."),
});

export interface ClanFormValues extends z.infer<typeof clanFormSchema> {}

interface ClanFormProps {
  formId: string;
  initialData?: ClanFormValues;
  onSubmit: (data: ClanFormValues, iconFile: File | null, bannerFile: File | null) => void;
  isLoading?: boolean;
}

export const ClanForm = ({
  formId,
  initialData,
  onSubmit,
  isLoading,
}: ClanFormProps) => {
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const form = useForm<ClanFormValues>({
    resolver: zodResolver(clanFormSchema),
    defaultValues: initialData || {
      name: "",
      tag: "",
      description: "",
    },
  });

  useEffect(() => {
    if (iconFile) {
      const objectUrl = URL.createObjectURL(iconFile);
      setIconPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setIconPreviewUrl(null);
    }
  }, [iconFile]);

  useEffect(() => {
    if (bannerFile) {
      const objectUrl = URL.createObjectURL(bannerFile);
      setBannerPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setBannerPreviewUrl(null);
    }
  }, [bannerFile]);

  const handleIconChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        form.setError("root", { message: "O ícone não pode exceder 20MB." });
        return;
      }
      setIconFile(file);
    } else {
      setIconFile(null);
    }
  };

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        form.setError("root", { message: "O banner não pode exceder 5MB." });
        return;
      }
      setBannerFile(file);
    } else {
      setBannerFile(null);
    }
  };

  const handleSubmit = (values: ClanFormValues) => {
    onSubmit(values, iconFile, bannerFile);
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Clã</FormLabel>
              <FormControl>
                <Input placeholder="Nome do seu clã" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tag"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag do Clã</FormLabel>
              <FormControl>
                <Input placeholder="TAG" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva seu clã..." {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormItem>
            <FormLabel>Ícone do Clã (Max 20MB)</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={handleIconChange} />
            </FormControl>
            <FormMessage />
            {iconPreviewUrl && (
              <div className="mt-4 relative w-32 h-32 border rounded-full overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={iconPreviewUrl}
                  alt="Icon Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!iconPreviewUrl && (
              <div className="mt-4 w-32 h-32 border rounded-full overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
          </FormItem>
          <FormItem>
            <FormLabel>Banner do Clã (Max 5MB)</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={handleBannerChange} />
            </FormControl>
            <FormMessage />
            {bannerPreviewUrl && (
              <div className="mt-4 relative w-full h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={bannerPreviewUrl}
                  alt="Banner Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!bannerPreviewUrl && (
              <div className="mt-4 w-full h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
          </FormItem>
        </div>
        {form.formState.errors.root && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
        )}
      </form>
    </Form>
  );
};
