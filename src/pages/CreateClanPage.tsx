import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Navbar from "@/components/Navbar";
import { ClanForm, ClanFormValues } from "@/components/forms/ClanForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface CreateClanPageProps {
  user: User | null;
  onLogout: () => void;
}

const CreateClanPage = ({ user, onLogout }: CreateClanPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateClan = async (values: ClanFormValues, iconFile: File | null, bannerFile: File | null) => {
    if (!user) {
      toast({ title: t('create_clan_page.toast.error'), description: t('create_clan_page.toast.login_required'), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let icon_url: string | null = null;
      let banner_url: string | null = null;

      // 1. Upload Icon if it exists
      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `icon-${user.id}-${uuidv4()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('clan_icons')
          .upload(filePath, iconFile);

        if (uploadError) throw new Error(`Erro no upload do ícone: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('clan_icons')
          .getPublicUrl(filePath);
        
        icon_url = publicUrlData.publicUrl;
      }

      // 2. Upload Banner if it exists
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${user.id}-${uuidv4()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('clan_icons')
          .upload(filePath, bannerFile);

        if (uploadError) throw new Error(`Erro no upload do banner: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('clan_icons')
          .getPublicUrl(filePath);
        
        banner_url = publicUrlData.publicUrl;
      }

      // 3. Call the RPC to create the clan and add the member
      const { data: newClanId, error: rpcError } = await supabase.rpc('create_clan', {
        name: values.name,
        tag: values.tag,
        description: values.description,
        icon_url: icon_url,
        banner_url: banner_url,
      });

      if (rpcError) throw new Error(`Erro ao criar clã: ${rpcError.message}`);

      // 4. On success, show toast and navigate
      toast({
        title: t('create_clan_page.toast.success'),
        description: t('create_clan_page.toast.created'),
      });

      // Invalidate queries to refetch user profile data (to show they are in a clan)
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      
      navigate(`/clans/${newClanId}`);

    } catch (error: any) {
      toast({
        title: t('create_clan_page.toast.error'),
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t('create_clan_page.title')}</h1>
            <p className="text-muted-foreground">
              {t('create_clan_page.subtitle')}
            </p>
          </div>
          <ClanForm
            formId="create-clan-form"
            onSubmit={handleCreateClan}
            isLoading={isLoading}
          />
          <div className="mt-8 flex justify-end">
            <Button type="submit" form="create-clan-form" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('create_clan_page.confirm_btn')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateClanPage;
