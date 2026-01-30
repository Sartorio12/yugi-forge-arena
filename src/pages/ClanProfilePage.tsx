import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Loader2, User as UserIcon, ShieldCheck, Shield, Settings, Send, Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FramedAvatar } from "@/components/FramedAvatar";
import UserDisplay from "@/components/UserDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClanAnalyticsDashboard } from "@/components/clans/ClanAnalyticsDashboard";
import { useTranslation } from "react-i18next";

interface ClanProfilePageProps {
  user: User | null;
  onLogout: () => void;
}

const ClanProfilePage = ({ user, onLogout }: ClanProfilePageProps) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const clanId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

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

  // Fetch pending invitation for the user
  const { data: invitation, isLoading: isLoadingInvitation } = useQuery({
    queryKey: ["clanInvitation", clanId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clan_invitations")
        .select("*")
        .eq("clan_id", clanId)
        .eq("invitee_id", user.id)
        .eq("status", "PENDING")
        .maybeSingle();

      if (error) {
         console.error("Error fetching invitation", error);
         return null;
      }
      return data;
    },
    enabled: !!user && !!clanId,
  });

  const isLoading = isLoadingClan || isLoadingMembers || isLoadingApplication || isLoadingInvitation;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="h-8 w-8 animate-spin mr-4" />
        {t('clan_profile.loading')}
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
      toast({ title: "Sucesso!", description: t('clan_profile.apply_success') });
      queryClient.invalidateQueries({ queryKey: ["clanApplication", clanId, user.id] });
    } catch (error: any) {
      toast({
        title: "Erro na Candidatura",
        description: error.message || t('clan_profile.apply_error'),
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRespondToInvitation = async (response: 'ACCEPTED' | 'REJECTED') => {
    if (!invitation) return;
    setIsResponding(true);
    try {
      const { error } = await supabase.rpc('respond_to_clan_invitation', {
        p_invitation_id: invitation.id,
        p_response: response
      });

      if (error) throw error;

      toast({
        title: response === 'ACCEPTED' ? "Convite aceito!" : "Convite recusado.",
        description: response === 'ACCEPTED' ? `Bem-vindo ao clã ${clan.name}!` : "Você recusou o convite.",
      });

      queryClient.invalidateQueries({ queryKey: ["clanInvitation", clanId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["clanMembers", clanId] });
      // Refresh clan data as member count changes
      queryClient.invalidateQueries({ queryKey: ["clan", clanId] });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível responder ao convite.",
        variant: "destructive",
      });
    } finally {
      setIsResponding(false);
    }
  };

  if (!clan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-red-500">
        <p className="text-2xl mb-4">{t('clan_profile.not_found')}</p>
        <Button asChild><Link to="/">{t('clan_profile.back_home')}</Link></Button>
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
        <div className="w-full h-48 bg-muted">
          <div className="container mx-auto h-full">
            {clan.banner_url ? (
              <img
                src={clan.banner_url}
                alt={`${clan.name} banner`}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary to-accent rounded-lg" />
            )}
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="relative pt-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <FramedAvatar
                avatarUrl={clan.icon_url}
                username={clan.name}
                sizeClassName="w-32 h-32"
              />
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
                      {t('clan_profile.manage_clan')}
                    </Link>
                  </Button>
                )}
                {!isMember && user && !invitation && (
                  <>
                    {hasPendingApplication ? (
                      <Button variant="outline" disabled>
                        {t('clan_profile.pending_application')}
                      </Button>
                    ) : (
                      <Button onClick={handleApply} disabled={isApplying}>
                        {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {t('clan_profile.apply')}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {invitation && (
            <Alert className="mb-8 border-primary bg-primary/10">
              <Mail className="h-4 w-4" />
              <AlertTitle>{t('clan_profile.invitation_title')}</AlertTitle>
              <AlertDescription className="flex items-center justify-between mt-2">
                <span>{t('clan_profile.invitation_desc')}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRespondToInvitation('ACCEPTED')} disabled={isResponding}>
                    {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {t('clan_profile.accept')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRespondToInvitation('REJECTED')} disabled={isResponding}>
                    {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    {t('clan_profile.refuse')}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('clan_profile.members', { count: members?.length || 0 })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Leader */}
                  {leader && (
                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                      <Link to={`/profile/${leader.id}`} className="flex items-center gap-4 group">
                        <FramedAvatar
                          userId={leader.id}
                          avatarUrl={leader.avatar_url}
                          frameUrl={leader.equipped_frame_url}
                          username={leader.username}
                          sizeClassName="h-10 w-10"
                        />
                        <span className="font-medium group-hover:text-primary transition-colors">
                          <UserDisplay profile={{ ...leader, clan: { tag: leader.clan_tag } }} />
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 text-yellow-400">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-semibold">{t('clan_profile.leader')}</span>
                      </div>
                    </div>
                  )}
                  {/* Strategists */}
                  {strategists && strategists.map(strategist => (
                     <div key={strategist.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                       <Link to={`/profile/${strategist.id}`} className="flex items-center gap-4 group">
                         <FramedAvatar
                           userId={strategist.id}
                           avatarUrl={strategist.avatar_url}
                           frameUrl={strategist.equipped_frame_url}
                           username={strategist.username}
                           sizeClassName="h-10 w-10"
                         />
                         <span className="font-medium group-hover:text-primary transition-colors">
                           <UserDisplay profile={{ ...strategist, clan: { tag: strategist.clan_tag } }} />
                         </span>
                       </Link>
                       <div className="flex items-center gap-2 text-blue-400"> {/* Use a different color for strategists */}
                         <ShieldCheck className="h-5 w-5" />
                         <span className="font-semibold">{t('clan_profile.strategist')}</span>
                       </div>
                     </div>
                  ))}
                  {/* Members */}
                  {regularMembers && regularMembers.map(member => (
                     <div key={member.id} className="flex items-center justify-between p-3 rounded-md">
                       <Link to={`/profile/${member.id}`} className="flex items-center gap-4 group">
                         <FramedAvatar
                           userId={member.id}
                           avatarUrl={member.avatar_url}
                           frameUrl={member.equipped_frame_url}
                           username={member.username}
                           sizeClassName="h-10 w-10"
                         />
                         <span className="font-medium group-hover:text-primary transition-colors">
                           <UserDisplay profile={{ ...member, clan: { tag: member.clan_tag } }} />
                         </span>
                       </Link>
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Shield className="h-5 w-5" />
                         <span>{t('clan_profile.member')}</span>
                       </div>
                     </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <ClanAnalyticsDashboard clanId={clanId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClanProfilePage;
