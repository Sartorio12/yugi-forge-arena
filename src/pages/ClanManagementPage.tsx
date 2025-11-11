import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import Navbar from "@/components/Navbar";
import UserDisplay from "@/components/UserDisplay";
import { Loader2, Trash2, UserX, Crown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ClanForm, ClanFormValues } from "@/components/forms/ClanForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClanManagementPageProps {
  user: User | null;
  onLogout: () => void;
}

const ClanManagementPage = ({ user, onLogout }: ClanManagementPageProps) => {
  const { id } = useParams<{ id: string }>();
  const clanId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Step 1: Fetch clan details
  const { data: clan, isLoading: isLoadingClan, error: clanError } = useQuery({
    queryKey: ["clan", clanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clans")
        .select("*")
        .eq("id", clanId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!clanId,
  });

  // Step 2: Fetch members and applications
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["clanMembers", clanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clan_members")
        .select("id, role, profiles(id, username, avatar_url)")
        .eq("clan_id", clanId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!clanId,
  });

  const { data: applications, isLoading: isLoadingApplications } = useQuery({
    queryKey: ["clanApplications", clanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clan_applications")
        .select("id, status, profiles(id, username, avatar_url)")
        .eq("clan_id", clanId)
        .eq("status", "PENDING");
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!clanId,
  });

  const currentUserMembership = members ? members.find(member => member.profiles?.id === user?.id) : undefined;
  const hasManagementPrivileges = currentUserMembership?.role === 'LEADER' || currentUserMembership?.role === 'STRATEGIST';

  const handleUpdateClan = async (values: ClanFormValues, iconFile: File | null, bannerFile: File | null) => {
    if (!user || !clan) return;

    setIsUpdating(true);
    try {
      let icon_url = clan.icon_url;
      let banner_url = clan.banner_url;

      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `icon-${user.id}-${uuidv4()}.${fileExt}`;
        const filePath = `public/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('clan_icons').upload(filePath, iconFile, { upsert: true });
        if (uploadError) throw new Error(`Erro no upload do ícone: ${uploadError.message}`);
        const { data: publicUrlData } = supabase.storage.from('clan_icons').getPublicUrl(filePath);
        icon_url = publicUrlData.publicUrl;
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${user.id}-${uuidv4()}.${fileExt}`;
        const filePath = `public/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('clan_icons').upload(filePath, bannerFile, { upsert: true });
        if (uploadError) throw new Error(`Erro no upload do banner: ${uploadError.message}`);
        const { data: publicUrlData } = supabase.storage.from('clan_icons').getPublicUrl(filePath);
        banner_url = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('clans')
        .update({
          name: values.name,
          tag: values.tag,
          description: values.description,
          icon_url: icon_url,
          banner_url: banner_url,
        })
        .eq('id', clanId);

      if (updateError) throw new Error(`Erro ao atualizar clã: ${updateError.message}`);

      toast({ title: "Sucesso!", description: "As informações do clã foram atualizadas." });
      queryClient.invalidateQueries({ queryKey: ["clan", clanId] });
      queryClient.invalidateQueries({ queryKey: ["clanMembers", clanId] });
      navigate(`/clans/${clanId}`);

    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro desconhecido.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManageApplication = async (applicationId: number, newStatus: 'ACCEPTED' | 'REJECTED') => {
    try {
      const { error } = await supabase.rpc('manage_clan_application', {
        p_application_id: applicationId,
        p_new_status: newStatus,
      });
      if (error) throw new Error(error.message);

      toast({ title: "Sucesso!", description: `Candidatura ${newStatus === 'ACCEPTED' ? 'aceita' : 'rejeitada'}.` });
      queryClient.invalidateQueries({ queryKey: ["clanApplications", clanId] });
      queryClient.invalidateQueries({ queryKey: ["clanMembers", clanId] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao gerenciar a candidatura.", variant: "destructive" });
    }
  };

  const handleDeleteClan = async () => { /* ... */ };
  const handleKickMember = async (memberId: string) => {
    if (!user || !clan) return;

    try {
      const { error } = await supabase
        .from('clan_members')
        .delete()
        .eq('clan_id', clanId)
        .eq('user_id', memberId);

      if (error) throw new Error(error.message);

      toast({ title: "Sucesso!", description: "Membro expulso do clã." });
      queryClient.invalidateQueries({ queryKey: ["clanMembers", clanId] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao expulsar o membro.", variant: "destructive" });
    }
  };
  const handlePromoteMember = async (memberId: string, role: 'LEADER' | 'STRATEGIST') => {
    if (!user || !clan) return;

    try {
      // Call the new RPC function to transfer ownership
      const { error: rpcError } = await supabase.rpc('transfer_clan_ownership', {
        p_clan_id: clanId,
        p_new_owner_id: memberId,
        p_new_role: role as 'LEADER' | 'STRATEGIST',
      });
      if (rpcError) throw new Error(`Erro ao transferir a liderança do clã: ${rpcError.message}`);

      toast({ title: "Sucesso!", description: `${role === 'LEADER' ? 'Líder' : 'Estrategista'} do clã atualizado.` });
      queryClient.invalidateQueries({ queryKey: ["clanMembers", clanId] });
      queryClient.invalidateQueries({ queryKey: ["clan", clanId] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao promover o membro.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Gerenciar Clã: {clan.name}</h1>
          
          <Card className="mb-8">
            <CardHeader><CardTitle>Editar Informações</CardTitle></CardHeader>
            <CardContent>
              <ClanForm
                formId="edit-clan-form"
                initialData={{ name: clan.name, tag: clan.tag, description: clan.description || "" }}
                onSubmit={handleUpdateClan}
              />
              <div className="mt-4 flex justify-end">
                <Button type="submit" form="edit-clan-form" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader><CardTitle>Candidaturas Pendentes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {applications && applications.length > 0 ? (
                applications.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                    <Link to={`/profile/${app.profiles.id}`} className="flex items-center gap-4 group">
                      <UserDisplay profile={app.profiles} clan={clan} />
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-600" onClick={() => handleManageApplication(app.id, 'ACCEPTED')}>
                        <Check className="h-5 w-5 mr-2" /> Aceitar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleManageApplication(app.id, 'REJECTED')}>
                        <X className="h-5 w-5 mr-2" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma candidatura pendente.</p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader><CardTitle>Gerenciar Membros</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {members?.filter(m => m.profiles && m.profiles.id !== user?.id).map(member => (
                <div key={member.profiles.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                  <Link to={`/profile/${member.profiles?.id}`} className="flex items-center gap-4 group">
                    <UserDisplay profile={member.profiles} clan={clan} />
                  </Link>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Crown className="h-4 w-4 mr-2" /> Promover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Promover Membro</AlertDialogTitle>
                          <AlertDialogDescription>
                            Selecione a função para o membro promovido.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePromoteMember(member.profiles.id, 'LEADER')}>
                            Promover a Líder
                          </AlertDialogAction>
                          <AlertDialogAction onClick={() => handlePromoteMember(member.profiles.id, 'STRATEGIST')}>
                            Promover a Estrategista
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="destructive" size="sm" onClick={() => handleKickMember(member.profiles.id)}>
                      <UserX className="h-4 w-4 mr-2" /> Expulsar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis. Tenha cuidado.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Deletar Clã
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá deletar permanentemente o clã e todos os seus dados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClan}>Deletar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ClanManagementPage;
