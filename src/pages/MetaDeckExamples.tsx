import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import UserDisplay from "@/components/UserDisplay";
import { Loader2, ArrowLeft, SearchX, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FramedAvatar } from '@/components/FramedAvatar';

interface MetaDeckExamplesProps {
  user: User | null;
  onLogout: () => void;
}

interface Deck {
  id: number;
  deck_name: string;
  is_genesys?: boolean;
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    equipped_frame_url?: string | null;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    } | null;
  } | null;
  featured_card?: {
    image_url_small: string;
    name: string;
  } | null;
}

const MetaDeckExamples = ({ user, onLogout }: MetaDeckExamplesProps) => {
  const params = useParams();
  const deckName = params["*"] ? decodeURIComponent(params["*"]) : "";
  const navigate = useNavigate();

  // Use raw name for searching cards
  const rawName = deckName || "";

  const { data: decks, isLoading } = useQuery<Deck[]>({
    queryKey: ["meta-decks-examples", rawName],
    queryFn: async () => {
      if (!rawName) return [];
      
      // Split raw name into terms (e.g. "Mitsurugi Yummy" -> ["Mitsurugi", "Yummy"])
      // Filter out very short terms to avoid noise
      const searchTerms = rawName
        .split(/\s+/)
        .map(t => t.replace(/[^\w\s\-/]/gi, '').trim()) // Clean chars but keep hyphens and slashes
        .filter(t => t.length > 1); // Ignore single chars

      if (searchTerms.length === 0) return [];

      console.log("Searching for intersection of terms:", searchTerms);

      const { data, error } = await supabase.rpc('get_decks_with_all_terms', { 
        search_terms: searchTerms 
      });

      if (error) {
        console.error("Error fetching meta decks:", error);
        throw error;
      }

      // Fetch featured cards for the results
      const decksWithFeaturedCards = await Promise.all(
        (data || []).map(async (deck) => {
          const { data: featuredCardData } = await supabase.rpc(
            "get_featured_card_for_deck",
            { p_deck_id: deck.id }
          ).single();

          // Need to fetch profile/clan info as RPC returns raw deck rows
          const { data: profileData } = await supabase
             .from('profiles')
             .select('id, username, avatar_url, equipped_frame_url, clan_members(clans(tag))')
             .eq('id', deck.user_id)
             .single();

          return {
            ...deck,
            profiles: profileData,
            featured_card: featuredCardData || null,
          } as Deck;
        })
      );

      return decksWithFeaturedCards;
    },
    enabled: !!rawName,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exemplos de {rawName}</h1>
            <p className="text-muted-foreground">
              Decks da comunidade contendo cartas relacionadas a "{rawName}"
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <Link to={`/deck/${deck.id}`} key={deck.id}>
                <Card className="h-full flex flex-col justify-between overflow-hidden group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-[hsl(0_0%_12%)] hover:bg-[hsl(0_0%_15%)] hover:border-primary/50 border-t-0 rounded-t-none">
                  <CardHeader className={deck.featured_card?.image_url_small ? "pb-2 p-0" : "pb-2 pt-4 px-4"}>
                    {deck.featured_card?.image_url_small && (
                      <div className="w-full h-[180px] overflow-hidden mb-2">
                        <img
                          src={deck.featured_card.image_url_small}
                          alt={deck.featured_card.name || "Featured Card"}
                          className="w-full h-full object-cover object-[0%_30%] scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 px-4">
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors line-clamp-1">
                        {deck.deck_name}
                      </CardTitle>
                      {deck.is_genesys && (
                        <Badge className="bg-secondary text-[10px] px-1.5 h-5">Genesys</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    {deck.profiles ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FramedAvatar
                          userId={deck.profiles.id}
                          avatarUrl={deck.profiles.avatar_url}
                          username={deck.profiles.username}
                          sizeClassName="h-5 w-5"
                          showFrame={false}
                        />
                        <UserDisplay profile={deck.profiles} clan={deck.profiles.clan_members?.clans?.tag ? { tag: deck.profiles.clan_members.clans.tag } : null} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">por Usuário Desconhecido</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-50">
            <SearchX className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Nenhum deck encontrado</h2>
            <p>Ninguém postou um deck de {rawName} ainda.</p>
          </div>
        )}
      </main>
      
      <ConditionalFooter />
    </div>
  );
};

export default MetaDeckExamples;