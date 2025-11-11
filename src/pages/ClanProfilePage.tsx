import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Loader2, User as UserIcon, ShieldCheck, Shield, Settings, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import UserDisplay from "@/components/UserDisplay";

interface ClanProfilePageProps {
  user: User | null;
  onLogout: () => void;
}

const ClanProfilePage = ({ user, onLogout }: ClanProfilePageProps) => {
  const { id } = useParams<{ id: string }>();
  const clanId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);

  // Fetch clan details
  const { data: clan, isLoading: isLoadingClan } = useQuery({
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

  // Fetch clan members
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["clanMembers", clanId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_clan_members', { p_clan_id: clanId });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!clanId,
  });

  // Fetch user's application status
  const { data: application, isLoading: isLoadingApplication } = useQuery({
    queryKey: ["clanApplication", clanId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clan_applications")
        .select("status")
        .eq("clan_id", clanId)
        .eq("user_id", user.id)
        .order('created_at', { ascending: false }); // Get the latest application first

      if (error) {
        throw new Error(error.message);
      }
      return data?.[0] || null; // Return the latest application or null
    },
    enabled: !!user && !!clanId,
  });

  const isLoading = isLoadingClan || isLoadingMembers || isLoadingApplication;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="h-8 w-8 animate-spin mr-4" />
        Carregando Clã...
      </div>
    );
  }

  const currentUserMemberInfo = members?.find(m => m.id === user?.id);
  const isMember = !!currentUserMemberInfo;
  const hasManagementPrivileges = (user?.id === clan?.owner_id) || (currentUserMemberInfo?.role === 'STRATEGIST');
  const hasPendingApplication = application?.status === 'PENDING';

  const handleApply = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para se candidatar.", variant: "destructive" });
      return;
    }
    setIsApplying(true);
    try {
      const { error } = await supabase.rpc('apply_to_clan', { p_clan_id: clanId });
      if (error) throw new Error(error.message);
      toast({ title: "Sucesso!", description: "Sua candidatura foi enviada." });
      queryClient.invalidateQueries({ queryKey: ["clanApplication", clanId, user.id] });
    } catch (error: any) {
      toast({
        title: "Erro na Candidatura",
        description: error.message || "Não foi possível enviar sua candidatura.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (!clan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-red-500">
        <p className="text-2xl mb-4">Clã não encontrado.</p>
        <Button asChild><Link to="/">Voltar para a Home</Link></Button>
      </div>
    );
  }

  const leader = members?.find(m => m.id === clan?.owner_id);
  const strategists = members?.filter(m => m.role === 'STRATEGIST' && m.id !== clan?.owner_id);
  const regularMembers = members?.filter(m => m.role === 'MEMBER');

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <main className="pb-12">
        <div className="relative h-48 bg-muted">
          {clan.banner_url && (
            <img
              src={clan.banner_url}
              alt={`${clan.name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          {!clan.banner_url && (
            <div className="w-full h-full bg-gradient-to-r from-primary to-accent" />
          )}
        </div>
        <div className="container mx-auto px-4">
          <div className="relative pt-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <Avatar className="w-32 h-32 rounded-lg border-4 border-background">
                <AvatarImage src={clan.icon_url || undefined} alt={clan.name} />
                <AvatarFallback className="text-4xl">
                  {clan.tag.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 md:pt-12 text-center md:text-left">
                <h1 className="text-4xl font-bold flex items-center gap-3 justify-center md:justify-start">
                  {clan.name} <span className="text-2xl text-muted-foreground">[{clan.tag}]</span>
                </h1>
                <p className="text-muted-foreground mt-2">{clan.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {hasManagementPrivileges && (
                  <Button asChild variant="outline">
                    <Link to={`/clans/${clanId}/manage`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Gerenciar Clã
                    </Link>
                  </Button>
                )}
                {!isMember && user && (
                  <>
                    {hasPendingApplication ? (
                      <Button variant="outline" disabled>
                        Candidatura Pendente
                      </Button>
                    ) : (
                      <Button onClick={handleApply} disabled={isApplying}>
                        {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Candidatar-se
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Membros ({members?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Leader */}
                  {leader && (
                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                      <Link to={`/profile/${leader.id}`} className="flex items-center gap-4 group">
                        <Avatar>
                          <AvatarImage src={leader.avatar_url} />
                          <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          <UserDisplay profile={{ ...leader, clan: { tag: leader.clan_tag } }} />
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 text-yellow-400">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-semibold">Líder</span>
                      </div>
                    </div>
                  )}
                  {/* Strategists */}
                  {strategists && strategists.map(strategist => (
                     <div key={strategist.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                       <Link to={`/profile/${strategist.id}`} className="flex items-center gap-4 group">
                         <Avatar>
                           <AvatarImage src={strategist.avatar_url} />
                           <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                         </Avatar>
                         <span className="font-medium group-hover:text-primary transition-colors">
                           <UserDisplay profile={{ ...strategist, clan: { tag: strategist.clan_tag } }} />
                         </span>
                       </Link>
                       <div className="flex items-center gap-2 text-blue-400"> {/* Use a different color for strategists */}
                         <ShieldCheck className="h-5 w-5" />
                         <span className="font-semibold">Estrategista</span>
                       </div>
                     </div>
                  ))}
                  {/* Members */}
                  {regularMembers && regularMembers.map(member => (
                     <div key={member.id} className="flex items-center justify-between p-3 rounded-md">
                       <Link to={`/profile/${member.id}`} className="flex items-center gap-4 group">
                         <Avatar>
                           <AvatarImage src={member.avatar_url} />
                           <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                         </Avatar>
                         <span className="font-medium group-hover:text-primary transition-colors">
                           <UserDisplay profile={{ ...member, clan: { tag: member.clan_tag } }} />
                         </span>
                       </Link>
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Shield className="h-5 w-5" />
                         <span>Membro</span>
                       </div>
                     </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              {/* Placeholder for future content like clan stats, recent activity, etc. */}
              <Card>
                <CardHeader><CardTitle>Atividade</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">Em breve...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClanProfilePage;
