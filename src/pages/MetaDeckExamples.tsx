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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
            <h1 className="text-3xl font-bold tracking-tight">{t('meta_deck_examples.title', { name: rawName })}</h1>
            <p className="text-muted-foreground">
              {t('meta_deck_examples.subtitle', { name: rawName })}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : decks && decks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {decks.map((deck) => (
              <Link to={`/deck/${deck.id}`} key={deck.id}>
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/10 hover:border-primary/50 transition-all group cursor-pointer">
                  {/* Thumbnail */}
                  <div className="w-12 h-16 shrink-0 overflow-hidden bg-muted rounded border border-border/50">
                    {deck.featured_card?.image_url_small ? (
                      <img
                        src={deck.featured_card.image_url_small}
                        alt={deck.featured_card.name || "Featured Card"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Layers className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                        {deck.deck_name}
                      </h3>
                      {deck.is_genesys && (
                        <Badge className="bg-secondary text-[10px] px-1.5 h-4">Genesys</Badge>
                      )}
                    </div>
                    
                    {deck.profiles ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="shrink-0">{t('meta_deck_examples.by')}</span>
                        <FramedAvatar
                          userId={deck.profiles.id}
                          avatarUrl={deck.profiles.avatar_url}
                          username={deck.profiles.username}
                          sizeClassName="h-4 w-4"
                          showFrame={false}
                        />
                        <UserDisplay 
                          profile={deck.profiles} 
                          clan={deck.profiles.clan_members?.clans?.tag ? { tag: deck.profiles.clan_members.clans.tag } : null} 
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('meta_deck_examples.by')} {t('meta_deck_examples.unknown_user')}</span>
                    )}
                  </div>

                  <div className="hidden sm:block text-muted-foreground group-hover:text-primary transition-colors">
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-50">
            <SearchX className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">{t('meta_deck_examples.no_decks_title')}</h2>
            <p>{t('meta_deck_examples.no_decks_desc', { name: rawName })}</p>
          </div>
        )}
      </main>
      
      <ConditionalFooter />
    </div>
  );
};

export default MetaDeckExamples;