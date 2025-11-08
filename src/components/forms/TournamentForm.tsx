import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { TablesInsert } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const tournamentFormSchema = z.object({
  title: z.string().min(2, { message: "O título deve ter pelo menos 2 caracteres." }),
  banner_image_url: z.string().optional(), // Will be handled by file upload
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
  event_date: z.date({
    required_error: "A data do evento é obrigatória.",
  }),
  status: z.enum(["Aberto", "Fechado", "Em Andamento"], { required_error: "O status é obrigatório." }),
  registration_link: z.string().url({ message: "URL de inscrição inválida." }).optional().or(z.literal("")),
  is_decklist_required: z.boolean().default(true),
});

interface TournamentFormProps {
  formId: string;
  initialData?: TablesInsert<"tournaments">;
  onSubmit: (data: TablesInsert<"tournaments">) => void;
  isLoading?: boolean;
}

export const TournamentForm = ({
  formId,
  initialData,
  onSubmit,
  isLoading,
}: TournamentFormProps) => {
  const { toast } = useToast();
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(initialData?.banner_image_url || null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const form = useForm<z.infer<typeof tournamentFormSchema>>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      banner_image_url: initialData?.banner_image_url || "",
      description: initialData?.description || "",
      event_date: initialData?.event_date ? new Date(initialData.event_date) : undefined,
      status: initialData?.status || "Aberto",
      registration_link: initialData?.registration_link || "",
      is_decklist_required: initialData?.is_decklist_required ?? true,
    },
  });

  useEffect(() => {
    if (bannerFile) {
      const objectUrl = URL.createObjectURL(bannerFile);
      setBannerPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (!initialData?.banner_image_url) {
      setBannerPreviewUrl(null);
    }
  }, [bannerFile, initialData?.banner_image_url]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBannerFile(event.target.files[0]);
    } else {
      setBannerFile(null);
      setBannerPreviewUrl(initialData?.banner_image_url || null);
    }
  };

  const uploadBannerImage = async (): Promise<string | null> => {
    if (!bannerFile) return null;

    setUploadingBanner(true);
    const fileExt = bannerFile.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tournament_banners')
      .upload(filePath, bannerFile, { cacheControl: '3600', upsert: false });

    setUploadingBanner(false);

    if (uploadError) {
      toast({
        title: "Erro no Upload",
        description: `Erro ao fazer upload da imagem: ${uploadError.message}`,
        variant: "destructive",
      });
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('tournament_banners')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  };

  const handleSubmit = async (values: z.infer<typeof tournamentFormSchema>) => {
    let finalBannerImageUrl = values.banner_image_url;

    if (bannerFile) {
      const uploadedUrl = await uploadBannerImage();
      if (uploadedUrl) {
        finalBannerImageUrl = uploadedUrl;
      } else {
        // If upload failed, prevent form submission
        return;
      }
    } else if (initialData?.banner_image_url && !bannerFile) {
      // If no new file selected, but there was an initial image, keep it
      finalBannerImageUrl = initialData.banner_image_url;
    } else {
      // No initial image and no new file selected
      finalBannerImageUrl = null;
    }

    const dataToSubmit: TablesInsert<"tournaments"> = {
      ...values,
      banner_image_url: finalBannerImageUrl,
      event_date: values.event_date.toISOString(),
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Nome do Torneio" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="banner_image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imagem do Banner</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </FormControl>
              <FormMessage />
              {(bannerPreviewUrl || initialData?.banner_image_url) && (
                <div className="mt-2 relative w-full h-48 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {uploadingBanner || isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <img
                      src={bannerPreviewUrl || initialData?.banner_image_url || ""}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              {!bannerPreviewUrl && !initialData?.banner_image_url && (
                <div className="mt-2 w-full h-48 border rounded-md overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
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
                <Textarea placeholder="Detalhes do torneio..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_decklist_required"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Exigir Decklist</FormLabel>
                <FormDescription>
                  Se ativado, os jogadores deverão submeter um deck para se inscrever.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="event_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data e Hora do Evento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP HH:mm", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                  <div className="p-3 border-t border-border">
                    <Input
                      type="time"
                      value={field.value ? format(field.value, "HH:mm") : ""}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = field.value || new Date();
                        newDate.setHours(parseInt(hours));
                        newDate.setMinutes(parseInt(minutes));
                        field.onChange(newDate);
                      }}
                      className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status do torneio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Fechado">Fechado</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="registration_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link de Inscrição Externo (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://discord.gg/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
