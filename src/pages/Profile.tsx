import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import DeckCard from "@/components/DeckCard";
import TrophyShelf from "@/components/TrophyShelf"; // Import TrophyShelf
import BannerUploadForm from "@/components/forms/BannerUploadForm"; // Import BannerUploadForm
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Loader2, User as UserIcon, Pencil, Plus, MessageSquare, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress"; // Import Progress
import { useState, useEffect } from "react";
import { FramedAvatar } from "@/components/FramedAvatar";
import { FrameInventory } from "@/components/FrameInventory";
import { useChat } from "@/components/chat/ChatProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROFILE_AVATARS } from "@/constants/profileAvatars";

interface Deck {
  id: number;
  deck_name: string;
  is_private: boolean;
  is_genesys?: boolean;
  user_id: string;
  deck_cards: { count: number }[];
}

import { Profile, useProfile } from "@/hooks/useProfile";
import UserDisplay from "@/components/UserDisplay";
import { Database } from "@/integrations/supabase/types"; // Import Database type
import { TitleInventory } from "@/components/TitleInventory";

type UserTournamentBanner = Database['public']['Tables']['user_tournament_banners']['Row'];

interface ProfileProps {
  user: User | null;
  onLogout: () => void;
}

const Profile = ({ user, onLogout }: ProfileProps) => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { openChat } = useChat();

  // Current logged in user profile (to check permissions)
  const { profile: currentUserProfile } = useProfile(user?.id);
  const isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'organizer';

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*, level, xp, equipped_frame_url, equipped_titles")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({ title: "Erro", description: "Perfil não encontrado.", variant: "destructive" });
        return null;
      }
      return data as Profile;
    },
    enabled: !!id,
  });

  // State for edit modal
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBannerUploadDialogOpen, setIsBannerUploadDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setDiscordUsername((profile as any).discord_username || "");
    }
  }, [profile]);

  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ["user-clan", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", id)
        .single();
      return data?.clans || null;
    },
    enabled: !!id,
  });

  const { data: userBanners, isLoading: bannersLoading } = useQuery<UserTournamentBanner[]>({
    queryKey: ["user-tournament-banners", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("user_tournament_banners")
        .select("*")
        .eq("user_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const { data: decks, isLoading: decksLoading } = useQuery<Deck[]>({
    queryKey: ["user-decks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select(`id, deck_name, is_private, is_genesys, user_id, deck_cards (count)`).eq("user_id", id);
      if (error) throw error;
      return data as Deck[];
    },
  });

  const handleDeleteDeck = async (deckId: number) => {
    console.log("Attempting to delete deck:", deckId);
    try {
      const { error: deckError } = await supabase.from("decks").delete().eq("id", deckId);
      if (deckError) throw deckError;
      toast({ title: "Sucesso", description: "Deck deletado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["user-decks", id] });
    } catch (error: any) {
      console.error("Error deleting deck:", error);
      // Check for foreign key constraint violation (code 23503) or specific message
      if (
        error.code === '23503' || 
        error.message?.includes('foreign key constraint') ||
        error.details?.includes('foreign key constraint')
      ) {
        toast({ title: "Erro", description: "Não é possível deletar o deck, cadastrado em algum torneio.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message || "Falha ao deletar o deck.", variant: "destructive" });
      }
    }
  };

  const handleDeleteTournamentBanner = async (bannerId: number) => {
    try {
      const { error } = await supabase
        .from("user_tournament_banners")
        .delete()
        .eq("id", bannerId);
        
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Banner removido." });
      queryClient.invalidateQueries({ queryKey: ["user-tournament-banners", id] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao remover banner.", variant: "destructive" });
    }
  };

  const handleRemoveBanner = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from("profiles").update({ banner_url: null }).eq('id', user.id);
      if (error) throw error;
      
      toast({ title: "Sucesso!", description: "Banner removido." });
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
      setBannerFile(null);
      // Also close the dialog if desired, or keep it open to show change? 
      // Usually closing is fine, or keeping it open to edit other things.
      // I'll keep it open but maybe I should update the local state 'profile' if I wasn't invalidating?
      // Invalidation is best.
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao remover o banner.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      let avatar_url = profile?.avatar_url;
      
      // Handle File Upload for Avatar
      if (avatarFile) {
        const filePath = `public/${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
        avatar_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      } else if (selectedPresetAvatar) {
        // Handle Preset Avatar Selection
        avatar_url = selectedPresetAvatar;
      }

      let banner_url = profile?.banner_url;
      if (bannerFile) {
        const filePath = `public/${user.id}/banner.jpg`;
        const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
        banner_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }

      const updates = { username, bio, discord_username: discordUsername, avatar_url, banner_url, updated_at: new Date() };
      const { error } = await supabase.from("profiles").update(updates).eq('id', user.id);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Perfil atualizado." });
      // queryClient.invalidateQueries({ queryKey: ["profile", id] });
      setOpen(false);
      setAvatarFile(null);
      setSelectedPresetAvatar(null); // Reset selection
      setBannerFile(null);
    } catch (error: Error) {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar o perfil.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePresetAvatarSelect = (filename: string) => {
    const fullPath = `/profilepic/${filename}`;
    setSelectedPresetAvatar(fullPath);
    setAvatarFile(null); // Clear file upload if preset is selected
  };

  const isLoading = profileLoading || decksLoading || clanLoading || bannersLoading;

  const publicDecks = decks?.filter((deck: any) => !deck.is_private) || [];
  const privateDecks = decks?.filter((deck: any) => deck.is_private) || [];
  const isProfileOwner = user?.id === profile?.id;
  const canSendMessage = user && !isProfileOwner && profile;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : profile ? (
        <main className="pb-12">
          <div className="w-full aspect-[3/2] sm:aspect-[4/1] bg-gradient-primary relative z-0">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
          <div className="container mx-auto px-4">

            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              
              {/* Avatar Container */}
              <div className="-mt-20 flex-shrink-0 z-10">
                <div className="relative">
                  <FramedAvatar 
                    avatarUrl={profile.avatar_url}
                    frameUrl={profile.equipped_frame_url}
                    username={profile.username}
                    sizeClassName="w-36 h-36"
                  />
                </div>
              </div>

              {/* Info Wrapper */}
              <div className="w-full flex-1 text-center md:text-left">
                <div className="md:mt-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm">
                  <h1 className="text-3xl font-bold mb-2">
                    <UserDisplay profile={profile} clan={clan} showTitles={true} />
                  </h1>
                  {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
                  {(profile as any).discord_username && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-[#5865F2]">Discord:</span> {(profile as any).discord_username}
                    </div>
                  )}
                  
                  {profile.level !== undefined && profile.xp !== undefined && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-bold text-primary">Nível de Duelista: {profile.level}</span>
                        <span className="text-muted-foreground">{profile.xp % 50} / 50 XP</span>
                      </div>
                      <Progress value={profile.xp % 50} className="h-2" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-center md:self-end pb-4">
                {isProfileOwner && (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button variant="outline"><Pencil className="h-4 w-4 mr-2" /> Editar Perfil</Button></DialogTrigger>
                                          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                            <DialogHeader><DialogTitle>Editar Perfil</DialogTitle></DialogHeader>
                                            <div className="flex-1 overflow-y-auto py-4 pr-2">
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-6 md:border-r md:border-border md:pr-10">
                                                  <div className="space-y-2">
                                                    <Label htmlFor="username">Nome de Usuário</Label>
                                                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <Label htmlFor="discordUsername">Discord (Ex: usuario#1234)</Label>
                                                    <Input id="discordUsername" value={discordUsername} onChange={(e) => setDiscordUsername(e.target.value)} placeholder="Seu nick no Discord" />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <Label htmlFor="bio">Bio</Label>
                                                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <Label htmlFor="avatar">Avatar</Label>
                                                    <Tabs defaultValue="upload" className="w-full">
                                                      <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="upload">Upload</TabsTrigger>
                                                        <TabsTrigger value="gallery">Galeria</TabsTrigger>
                                                      </TabsList>
                                                      <TabsContent value="upload" className="space-y-2">
                                                        <Input id="avatar" type="file" accept="image/*" onChange={(e) => {
                                                          const file = e.target.files?.[0];
                                                          if (!file) {
                                                            setAvatarFile(null);
                                                            return;
                                                          }
                                                          if (file.size > 10 * 1024 * 1024) { // 10MB
                                                            toast({
                                                              title: "Arquivo muito grande",
                                                              description: "O avatar não pode exceder 10MB.",
                                                              variant: "destructive",
                                                            });
                                                            e.target.value = "";
                                                            return;
                                                          }
                                                          setAvatarFile(file);
                                                          setSelectedPresetAvatar(null); // Clear preset if file is uploaded
                                                        }} />
                                                        <p className="text-xs text-muted-foreground">Selecione uma imagem do seu dispositivo (Max 10MB).</p>
                                                      </TabsContent>
                                                      <TabsContent value="gallery">
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 h-64 overflow-y-auto p-2 border rounded-md bg-black/20">
                                                          {PROFILE_AVATARS.map((avatar, index) => (
                                                            <div 
                                                              key={index} 
                                                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all relative w-full pt-[100%] ${selectedPresetAvatar === `/profilepic/${avatar}` ? 'border-primary ring-2 ring-primary ring-opacity-50 scale-95' : 'border-border hover:border-primary/50'}`}
                                                              onClick={() => handlePresetAvatarSelect(avatar)}
                                                            >
                                                              <img 
                                                                src={`/profilepic/${avatar}`} 
                                                                alt={`Avatar ${index}`} 
                                                                className="absolute top-0 left-0 w-full h-full object-cover"
                                                                loading="lazy"
                                                              />
                                                            </div>
                                                          ))}
                                                        </div>
                                                        {selectedPresetAvatar && (
                                                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                                                            <Image className="h-3 w-3" /> Imagem da galeria selecionada
                                                          </p>
                                                        )}
                                                      </TabsContent>
                                                    </Tabs>
                                                  </div>
                                                  <div className="space-y-2">
                                                    <div className="flex justify-between items-center mb-2">
                                                      <Label htmlFor="banner">Banner (Max 10MB)</Label>
                                                      {profile.banner_url && (
                                                        <Button 
                                                          type="button" 
                                                          variant="destructive" 
                                                          size="sm" 
                                                          onClick={handleRemoveBanner}
                                                          disabled={isUpdating}
                                                        >
                                                          <Trash2 className="h-3 w-3 mr-1" /> Remover
                                                        </Button>
                                                      )}
                                                    </div>
                                                    <Input id="banner" type="file" accept="image/*" onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (!file) {
                                                        setBannerFile(null);
                                                        return;
                                                      }
                                                      if (file.size > 10 * 1024 * 1024) { // 10MB
                                                        toast({
                                                          title: "Arquivo muito grande",
                                                          description: "O banner não pode exceder 10MB.",
                                                          variant: "destructive",
                                                        });
                                                        e.target.value = "";
                                                        return;
                                                      }
                                                      setBannerFile(file);
                                                    }} />
                                                  </div>
                                                </div>

                                                <div className="space-y-6">
                                                  <div className="space-y-2">
                                                    <Label>Moldura</Label>
                                                    <div className="border rounded-lg p-4 bg-card">
                                                      <FrameInventory 
                                                        userId={user.id} 
                                                        currentEquippedFrame={profile.equipped_frame_url} 
                                                        onClose={() => setOpen(false)}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="space-y-2">
                                                    <Label>Títulos</Label>
                                                    <div className="border rounded-lg p-4 bg-card">
                                                      <TitleInventory 
                                                        userId={user.id} 
                                                        currentEquippedTitles={profile.equipped_titles}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            <DialogFooter>
                                              <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                                              <Button onClick={handleProfileUpdate} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Alterações</Button>
                                            </DialogFooter>
                                          </DialogContent>                  </Dialog>
                )}
                {canSendMessage && (
                  <Button variant="outline" onClick={() => openChat(profile.id)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar Mensagem
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-12 md:mt-20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tight">
                  Meus Decks
                </h2>
                {isProfileOwner && ( 
                  <Button asChild>
                    <Link to="/deck-builder">
                      <Plus className="mr-2 h-4 w-4" /> Novo Deck
                    </Link>
                  </Button>
                )}
              </div>
              <h3 className="text-2xl font-bold mb-6">Decks Públicos</h3>
              {publicDecks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicDecks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      id={deck.id}
                      deckName={deck.deck_name}
                      cardCount={deck.deck_cards && deck.deck_cards.length > 0 ? deck.deck_cards[0].count : 0}
                      isPrivate={deck.is_private}
                      is_genesys={deck.is_genesys}
                      onDelete={handleDeleteDeck}
                      isOwner={user?.id === deck.user_id} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg"><p className="text-muted-foreground">
                  {user?.id === profile.id ? "Você não tem decks públicos." : "Este usuário não tem decks públicos."}
                </p></div>
              )}

              {isProfileOwner && ( 
                <div className="mt-12">
                  <h3 className="text-2xl font-bold mb-6">Decks Privados</h3>
                  {privateDecks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {privateDecks.map((deck) => (
                        <DeckCard
                          key={deck.id}
                          id={deck.id}
                          deckName={deck.deck_name}
                          cardCount={deck.deck_cards && deck.deck_cards.length > 0 ? deck.deck_cards[0].count : 0}
                          isPrivate={deck.is_private}
                          is_genesys={deck.is_genesys}
                          onDelete={handleDeleteDeck}
                          isOwner={user?.id === deck.user_id} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg"><p className="text-muted-foreground">Você não tem decks privados.</p></div>
                  )}
                </div>
              )}

              {/* Trophy Shelf Section */}
              <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold tracking-tight">
                    Banners de Torneio
                  </h2>
                  {isProfileOwner && user && ( // Ensure user is not null before accessing user.id
                    <Dialog open={isBannerUploadDialogOpen} onOpenChange={setIsBannerUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Banner</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Adicionar Novo Banner de Torneio</DialogTitle></DialogHeader>
                        <BannerUploadForm
                          userId={user.id}
                          onUploadSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["user-tournament-banners", id] });
                            setIsBannerUploadDialogOpen(false);
                          }}
                          onClose={() => setIsBannerUploadDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {bannersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <TrophyShelf 
                    banners={userBanners || []} 
                    isOwner={isProfileOwner}
                    onDelete={handleDeleteTournamentBanner}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground text-lg">Perfil não encontrado.</p></div>
      )}
    </div>
  );
};

export default Profile;