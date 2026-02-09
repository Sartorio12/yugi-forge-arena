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
  type: z.enum(["standard", "liga", "banimento", "genesys"], { required_error: "O tipo de torneio é obrigatório." }).default("standard"),
  format: z.enum(["single_elimination", "swiss", "groups"], { required_error: "O esquema do torneio é obrigatório." }).default("single_elimination"),
  banishment_count: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().int().min(0).default(0)
  ),
  status: z.enum(["Aberto", "Fechado", "Em Andamento"], { required_error: "O status é obrigatório." }),
  registration_link: z.string().url({ message: "URL de inscrição inválida." }).optional().or(z.literal("")),
  is_decklist_required: z.boolean().default(true),
  max_participants: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().int().positive({ message: "O número máximo de participantes deve ser um inteiro positivo." }).nullable().optional()
  ),
  num_decks_allowed: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().int().min(1, { message: "O número de decks deve ser no mínimo 1." }).default(1)
  ),
  tournament_model: z.enum(["Diário", "Semanal"], { required_error: "O modelo de torneio é obrigatório." }).default("Diário"),
  exclusive_organizer_only: z.boolean().default(false),
  is_private: z.boolean().default(false),
  show_on_home: z.boolean().default(true),
});

interface TournamentFormProps {
  formId: string;
  initialData?: TablesInsert<"tournaments"> & { id?: number }; // Add id for existing tournaments
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
      type: (initialData as any)?.type || "standard",
      format: (initialData as any)?.format || "single_elimination",
      banishment_count: (initialData as any)?.banishment_count || 0,
      status: initialData?.status || "Aberto",
      registration_link: initialData?.registration_link || "",
      is_decklist_required: initialData?.is_decklist_required ?? true,
      max_participants: initialData?.max_participants || undefined,
      num_decks_allowed: initialData?.num_decks_allowed || 1,
      tournament_model: (initialData as any)?.tournament_model || "Diário",
      exclusive_organizer_only: initialData?.exclusive_organizer_only ?? false,
      is_private: (initialData as any)?.is_private ?? false,
      show_on_home: (initialData as any)?.show_on_home ?? true,
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
      max_participants: values.max_participants || null,
      num_decks_allowed: values.num_decks_allowed,
      tournament_model: values.tournament_model,
      banishment_count: values.banishment_count,
      is_private: values.is_private,
      show_on_home: values.show_on_home,
      format: values.format,
    } as any;
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
          name="exclusive_organizer_only"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Modo Exclusivo do Organizador</FormLabel>
                <FormDescription>
                  Se ativado, apenas o organizador deste torneio (você) poderá ver os decks. Outros admins não terão acesso.
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
          name="is_private"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Torneio Privado (Apenas Convidados)</FormLabel>
                <FormDescription>
                  Se ativado, jogadores não poderão se inscrever sozinhos. Você deverá adicioná-los manualmente no painel de gerenciamento.
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
          name="show_on_home"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Exibir na Página Inicial</FormLabel>
                <FormDescription>
                  Se desativado, o torneio não aparecerá no carrossel da Home.
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
          name="max_participants"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Máximo de Participantes (Opcional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 32" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormDescription>
                Deixe em branco para não definir um limite.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="num_decks_allowed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Decks por Jogador</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 1" {...field} onChange={e => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormDescription>
                Quantos decks cada jogador pode registrar no torneio.
              </FormDescription>
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
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Torneio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="liga">Liga (Seleção de Times)</SelectItem>
                  <SelectItem value="banimento">Banimento (Custom Banlist)</SelectItem>
                  <SelectItem value="genesys">Genesys (Deck Type Only)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Esquema do Torneio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o esquema" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single_elimination">Mata-mata (Eliminatória Simples)</SelectItem>
                  <SelectItem value="swiss">Suíço (Pontos Corridos)</SelectItem>
                  <SelectItem value="groups">Fase de Grupos</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Define a estrutura de organização das partidas.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tournament_model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo de Torneio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Diário">Diário</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Marcação interna para organização (Diário: começa e termina no mesmo dia | Semanal: ao longo das semanas).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("type") === "banimento" && (
          <FormField
            control={form.control}
            name="banishment_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cartas a Banir por Jogador</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Ex: 3" 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value))} 
                  />
                </FormControl>
                <FormDescription>
                  Quantas cartas cada jogador deve escolher para a banlist do torneio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
