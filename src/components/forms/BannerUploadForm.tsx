import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

const formSchema = z.object({
  title: z.string().optional(), // Make title optional
  bannerFile: z.any()
    .refine((file) => file?.length > 0, "A imagem do banner é obrigatória.")
    .refine((file) => file?.[0]?.size <= 5 * 1024 * 1024, "O tamanho máximo do banner é 5MB.")
    .refine((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file?.[0]?.type), "Apenas formatos .jpg, .jpeg, .png e .webp são aceitos."),
});

type BannerUploadFormProps = {
  userId: string;
  onUploadSuccess: () => void;
  onClose: () => void;
};

const BannerUploadForm: React.FC<BannerUploadFormProps> = ({ userId, onUploadSuccess, onClose }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      bannerFile: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsUploading(true);
    try {
      const file = values.bannerFile[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `tournament_banners/${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tournament_banners')
        .upload(filePath, file, {
          cacheControl: '31536000'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('tournament_banners')
        .getPublicUrl(filePath);

      const banner_url = publicUrlData.publicUrl;

      const { error: insertError } = await supabase
        .from('user_tournament_banners')
        .insert({
          user_id: userId,
          title: values.title || null, // Set to null if title is empty
          banner_url: banner_url,
        } as Database['public']['Tables']['user_tournament_banners']['Insert']); // Cast to Insert type

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Sucesso!",
        description: "Banner de torneio enviado com sucesso.",
      });
      form.reset();
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar o banner. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bannerFile"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Imagem do Banner</FormLabel>
              <FormControl>
                <Input
                  {...fieldProps}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    onChange(event.target.files);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isUploading}>
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Banner
        </Button>
      </form>
    </Form>
  );
};

export default BannerUploadForm;
