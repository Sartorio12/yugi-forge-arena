import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import DeckCard from "@/components/DeckCard";
import TrophyShelf from "@/components/TrophyShelf"; // Import TrophyShelf
import BannerUploadForm from "@/components/forms/BannerUploadForm"; // Import BannerUploadForm
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Loader2, User as UserIcon, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface Deck {
  id: number;
  deck_name: string;
  is_private: boolean;
  is_genesys?: boolean;
  user_id: string;
  deck_cards: { count: number }[];
}

import { Profile } from "@/hooks/useProfile";
import UserDisplay from "@/components/UserDisplay";
import { Database } from "@/integrations/supabase/types"; // Import Database type

type UserTournamentBanner = Database['public']['Tables']['user_tournament_banners']['Row'];

interface ProfileProps {
  user: User | null;
  onLogout: () => void;
}

const Profile = ({ user, onLogout }: ProfileProps) => {
  const { id } = useParams();
  console.log("Profile page ID:", id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // State for edit modal
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBannerUploadDialogOpen, setIsBannerUploadDialogOpen] = useState(false); // State for banner upload dialog

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      }
      setProfile(data);
      setProfileLoading(false);
    };

    fetchProfile();
  }, [id]);

  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ["user-clan", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", id)
        .single();
      return data?.clans;
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
    try {
      const { error: cardsError } = await supabase.from("deck_cards").delete().eq("deck_id", deckId);
      if (cardsError) throw cardsError;
      const { error: deckError } = await supabase.from("decks").delete().eq("id", deckId);
      if (deckError) throw deckError;
      toast({ title: "Sucesso", description: "Deck deletado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["user-decks", id] });
    } catch (error: Error) {
      toast({ title: "Erro", description: error.message || "Falha ao deletar o deck.", variant: "destructive" });
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      let avatar_url = profile?.avatar_url;
      if (avatarFile) {
        const filePath = `public/${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
        avatar_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }

      let banner_url = profile?.banner_url;
      if (bannerFile) {
        const filePath = `public/${user.id}/banner.jpg`;
        const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filePath);
        banner_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }

      const updates = { username, bio, avatar_url, banner_url, updated_at: new Date() };
      const { error } = await supabase.from("profiles").update(updates).eq('id', user.id);
      if (error) throw error;

      toast({ title: "Sucesso!", description: "Perfil atualizado." });
      // queryClient.invalidateQueries({ queryKey: ["profile", id] });
      setOpen(false);
      setAvatarFile(null);
      setBannerFile(null);
    } catch (error: Error) {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar o perfil.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const isLoading = profileLoading || decksLoading || clanLoading || bannersLoading;

  const publicDecks = decks?.filter((deck: any) => !deck.is_private) || [];
  const privateDecks = decks?.filter((deck: any) => deck.is_private) || [];
  const isProfileOwner = user?.id === profile?.id; // Renamed to avoid conflict with DeckCard's isOwner

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      {isLoading ? (
        <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : profile ? (
        <main className="pb-12">
          <div className="relative h-64 bg-gradient-primary">
            {profile.banner_url && <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />}
          </div>
          <div className="container mx-auto px-4">
            <div className="relative -mt-8 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-32 h-32 rounded-full border-4 border-background object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-background bg-card flex items-center justify-center"><UserIcon className="h-16 w-16 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 md:pt-12">
                  <h1 className="text-3xl font-bold mb-2">
                    <UserDisplay profile={profile} clan={clan} />
                  </h1>
                  {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
                </div>
                {isProfileOwner && ( // Use isProfileOwner here
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button variant="outline"><Pencil className="h-4 w-4 mr-2" /> Editar Perfil</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Editar Perfil</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Nome de Usuário</Label>
                          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="avatar">Avatar (Max 10MB)</Label>
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
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banner">Banner (Max 10MB)</Label>
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
                      <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                        <Button onClick={handleProfileUpdate} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Alterações</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div>
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
                  <TrophyShelf banners={userBanners || []} />
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



