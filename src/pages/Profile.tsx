import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import DeckCard from "@/components/DeckCard";
import { User } from "@supabase/supabase-js";
import { Loader2, User as UserIcon } from "lucide-react";

interface ProfileProps {
  user: User | null;
  onLogout: () => void;
}

const Profile = ({ user, onLogout }: ProfileProps) => {
  const { id } = useParams();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ["user-decks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select(`
          *,
          deck_cards (count)
        `)
        .eq("user_id", id);

      if (error) throw error;
      return data;
    },
  });

  const isLoading = profileLoading || decksLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : profile ? (
        <main className="pb-12">
          {/* Banner */}
          <div className="relative h-64 bg-gradient-primary">
            {profile.banner_url && (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="container mx-auto px-4">
            {/* Avatar & Info */}
            <div className="relative -mt-16 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-32 h-32 rounded-full border-4 border-background object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-background bg-card flex items-center justify-center">
                      <UserIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
                  {profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Decks Salvos */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Meus Decks Salvos</h2>
              {decks && decks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {decks.map((deck: any) => (
                    <DeckCard
                      key={deck.id}
                      id={deck.id}
                      deckName={deck.deck_name}
                      cardCount={deck.deck_cards?.[0]?.count || 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">
                    Nenhum deck salvo ainda.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground text-lg">Perfil não encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
